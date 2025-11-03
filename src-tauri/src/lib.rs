use serde::{Serialize, Deserialize};
use rusqlite::{Connection, params};
use std::sync::Mutex;
use tauri::State;
use serde_json::json;
use serde_json::Value;

pub struct AppState {
    pub conn: Mutex<Connection>,
}

impl AppState {
    pub fn new() -> Self {
        let home = std::env::home_dir().unwrap_or_default();
        let path = format!("{}/finances.db", home.display());
        let conn = Connection::open(path).expect("Failed to open finances.db");
        conn.execute_batch("PRAGMA foreign_keys=ON;").expect("Failed to enable foreign keys");
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS category (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS subcategory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                UNIQUE(category_id, name)
            );
            CREATE TABLE IF NOT EXISTS operation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subcategory_id INTEGER NOT NULL REFERENCES subcategory(id) ON DELETE CASCADE,
                date TEXT NOT NULL,
                value INTEGER NOT NULL
            );
            "#).expect("Failed to create tables");
        AppState { conn: Mutex::new(conn) }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: usize,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subcategory {
    pub id: usize,
    pub category_id: usize,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub id: usize,
    pub subcategory_id: usize,
    pub date: String,
    pub value: u64,
}

#[tauri::command]
fn create_category(state: State<AppState>, name: String) -> Result<Value, String> {
    println!("create_category called with name: {}", name);
    let conn = state.conn.lock().unwrap();
    let mut stmt = match conn.prepare("INSERT INTO category (name) VALUES (?1) RETURNING id") {
        Ok(stmt) => stmt,
        Err(e) => {
            println!("Failed to prepare create_category stmt: {}", e);
            return Err(format!("DB Error: {}", e));
        }
    };
    let id_result: Result<i64, _> = stmt.query_row(params![name], |row| row.get(0));
    match id_result {
        Ok(id) => {
            println!("Category '{}' created successfully, id={}", name, id);
            Ok(json!({ "id": id }))
        },
        Err(e) => {
            println!("Failed to create category '{}': {}", name, e);
            Err(format!("DB Error: {}", e))
        }
    }
}

#[tauri::command]
fn create_subcategory(state: State<AppState>, category_id: usize, name: String) -> Result<Value, String> {
    println!("create_subcategory called with category_id: {}, name: {}", category_id, name);
    let conn = state.conn.lock().unwrap();
    let mut stmt = match conn.prepare(
        "INSERT INTO subcategory (category_id, name) VALUES (?1, ?2) RETURNING id"
    ) {
        Ok(stmt) => stmt,
        Err(e) => {
            println!("Failed to prepare create_subcategory stmt: {}", e);
            return Err(format!("DB Error: {}", e));
        }
    };
    let id_result: Result<i64, _> = stmt.query_row(params![category_id as i64, name], |row| row.get(0));
    match id_result {
        Ok(id) => {
            println!("Subcategory '{}' (category_id={}) created successfully, id={}", name, category_id, id);
            Ok(json!({ "id": id }))
        },
        Err(e) => {
            println!("Failed to create subcategory '{}': {}", name, e);
            Err(format!("DB Error: {}", e))
        }
    }
}

#[tauri::command]
fn create_operation(state: State<AppState>, subcategory_id: usize, date: String, value: u64) -> Result<Value, String> {
    println!("create_operation called: subcategory_id={}, date={}, value={}", subcategory_id, date, value);
    let conn = state.conn.lock().unwrap();
    let mut stmt = match conn.prepare(
        "INSERT INTO operation (subcategory_id, date, value) VALUES (?1, ?2, ?3) RETURNING id"
    ) {
        Ok(stmt) => stmt,
        Err(e) => {
            println!("Failed to prepare create_operation stmt: {}", e);
            return Err(format!("DB Error: {}", e));
        }
    };
    let id_result: Result<i64, _> = stmt.query_row(params![subcategory_id as i64, date, value as i64], |row| row.get(0));
    match id_result {
        Ok(id) => {
            println!("Operation created successfully, id={}", id);
            Ok(json!({ "id": id }))
        },
        Err(e) => {
            println!("Failed to create operation: {}", e);
            Err(format!("DB Error: {}", e))
        }
    }
}

#[tauri::command]
fn list_categories(state: State<AppState>) -> Result<Value, String> {
    println!("list_categories called");
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name FROM category").map_err(|e| e.to_string())?;
    let cats_iter = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut cats = vec![];
    for cat in cats_iter {
        cats.push(cat.map_err(|e| e.to_string())?);
    }
    Ok(serde_json::to_value(&cats).unwrap())
}

#[tauri::command]
fn list_subcategories(state: State<AppState>) -> Result<Value, String> {
    println!("list_subcategories called");
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, category_id, name FROM subcategory").map_err(|e| e.to_string())?;
    let subs_iter = stmt
        .query_map([], |row| {
            Ok(Subcategory {
                id: row.get(0)?,
                category_id: row.get(1)?,
                name: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut subs = vec![];
    for sub in subs_iter {
        subs.push(sub.map_err(|e| e.to_string())?);
    }
    Ok(serde_json::to_value(&subs).unwrap())
}

#[tauri::command]
fn remove_category(state: State<AppState>, id: usize) -> Result<(), String> {
    println!("remove_category called with id: {}", id);
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM category WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn remove_subcategory(state: State<AppState>, id: usize) -> Result<(), String> {
    println!("remove_subcategory called with id: {}", id);
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM subcategory WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_category(state: State<AppState>, id: usize, name: String) -> Result<(), String> {
    println!("update_category called: id={} name={}", id, name);
    let conn = state.conn.lock().unwrap();
    conn.execute("UPDATE category SET name=?1 WHERE id=?2", params![name, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_subcategory(state: State<AppState>, id: usize, name: String) -> Result<(), String> {
    println!("update_subcategory called: id={} name={}", id, name);
    let conn = state.conn.lock().unwrap();
    conn.execute("UPDATE subcategory SET name=?1 WHERE id=?2", params![name, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_operations(state: State<AppState>) -> Result<Value, String> {
    println!("list_operations called");
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, subcategory_id, date, value FROM operation ORDER BY date DESC, id DESC")
        .map_err(|e| e.to_string())?;
    
    let ops_iter = stmt.query_map([], |row| {
        Ok(Operation {
            id: row.get(0)?,
            subcategory_id: row.get(1)?,
            date: row.get(2)?,
            value: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut ops = vec![];
    for op in ops_iter {
        ops.push(op.map_err(|e| e.to_string())?);
    }
    Ok(serde_json::to_value(&ops).unwrap())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();
    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                create_category, create_subcategory, list_categories, list_subcategories, remove_category, remove_subcategory, update_category, update_subcategory, create_operation, list_operations
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
