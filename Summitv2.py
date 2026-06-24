import sqlite3
from datetime import date, timedelta, datetime
import pandas as pd
import streamlit as st

# ==============================================================================
# STREAMLIT PAGE CONFIGURATION
# ==============================================================================
st.set_page_config(
    page_title="Summit Command Center",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ==============================================================================
# HIGH-TECH HIGH-CONTRAST DIGITAL HUD THEMING (CUSTOM CSS INJECTION)
# ==============================================================================
def inject_hud_styling():
    st.markdown("""
    <style>
    /* Google Fonts for Modern, Clean, and Rounded Tech Typography */
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
    
    /* Core Application Base Styles */
    .stApp {
        background: radial-gradient(circle at 50% 10%, #160a1d 0%, #060309 100%) !important;
        color: #a3a8cc !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
    }
    
    /* Header & Cybernetic HUD Typography */
    h1, h2, h3, h4 {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-weight: 800 !important;
        color: #ff00a0 !important;
        text-shadow: 0 0 15px rgba(255, 0, 160, 0.45) !important;
        letter-spacing: 1px !important;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(255, 0, 160, 0.15);
        padding-bottom: 8px;
    }
    
    h5, h6 {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-weight: 700 !important;
        color: #d946ef !important;
        text-shadow: 0 0 10px rgba(217, 70, 239, 0.3) !important;
        letter-spacing: 0.5px !important;
    }
    
    /* Command Interface Interactive Elements */
    .stButton>button {
        background: linear-gradient(135deg, #1f0b2a 0%, #0b0410 100%) !important;
        color: #ff00a0 !important;
        border: 1px solid rgba(255, 0, 160, 0.3) !important;
        border-radius: 20px !important; /* Rounded pill style buttons */
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        text-transform: uppercase !important;
        font-size: 0.8rem !important;
        font-weight: 700 !important;
        letter-spacing: 1px !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
        padding: 0.5rem 1.5rem !important;
    }
    
    .stButton>button:hover {
        background: #ff00a0 !important;
        color: #060309 !important;
        border-color: #ff00a0 !important;
        box-shadow: 0 0 18px rgba(255, 0, 160, 0.6), inset 0 0 2px rgba(255, 255, 255, 0.2) !important;
        transform: translateY(-1px);
    }
    
    /* Tech System Card Containers */
    div[data-testid="stExpander"] {
        background-color: rgba(18, 11, 28, 0.8) !important;
        border: 1px solid rgba(217, 70, 239, 0.25) !important;
        border-radius: 12px !important; /* Smooth rounded borders */
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.5) !important;
        transition: all 0.3s ease !important;
    }
    div[data-testid="stExpander"]:hover {
        border-color: rgba(217, 70, 239, 0.6) !important;
        box-shadow: 0 6px 25px rgba(217, 70, 239, 0.15) !important;
    }
    
    /* Glowing Indicator Metrics styling */
    div[data-testid="stMetric"] {
        background: rgba(18, 11, 28, 0.7) !important;
        border: 1px solid rgba(255, 0, 160, 0.2) !important;
        padding: 16px !important;
        border-radius: 12px !important;
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4) !important;
        transition: all 0.3s ease;
    }
    div[data-testid="stMetric"]:hover {
        border-color: #ff00a0 !important;
        box-shadow: 0 0 18px rgba(255, 0, 160, 0.2) !important;
    }
    div[data-testid="stMetricValue"] {
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-weight: 800 !important;
        color: #ffffff !important;
        font-size: 1.8rem !important;
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.3) !important;
    }
    div[data-testid="stMetricLabel"] {
        color: #a3a8cc !important;
        font-size: 0.75rem !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
    }
    
    /* UI Inputs & Control Matrix */
    input, textarea, select {
        background-color: #0c0712 !important;
        color: #ff00a0 !important;
        border: 1px solid rgba(255, 0, 160, 0.25) !important;
        border-radius: 8px !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6) !important;
    }
    input:focus, textarea:focus, select:focus {
        border-color: #ff00a0 !important;
        box-shadow: 0 0 12px rgba(255, 0, 160, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.6) !important;
    }
    
    /* Custom Decorative Cyber Lines */
    .hud-title-bar {
        border-left: 4px solid #ff00a0;
        padding-left: 14px;
        margin-bottom: 24px;
    }
    .hud-caption {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 500;
        color: #7b7f9e !important;
        letter-spacing: 0.5px;
        font-size: 0.8rem;
    }
    
    /* Custom Border Cards */
    div[data-testid="element-container"] .stMarkdown div p code {
        background-color: #1a0f26 !important;
        color: #ff00a0 !important;
        border: 1px solid rgba(255, 0, 160, 0.25) !important;
        padding: 2px 8px !important;
        border-radius: 6px !important;
    }
    
    /* Navigation system separator overrides */
    hr {
        border-top: 1px solid rgba(255, 0, 160, 0.15) !important;
    }
    </style>
    """, unsafe_allow_html=True)

# ==============================================================================
# DATABASE INITIALIZATION & SAFELY MANAGED MIGRATION
# ==============================================================================
def init_db():
    conn = sqlite3.connect("summit.db", check_same_thread=False)
    cursor = conn.cursor()
    
    # Enable Foreign Key Enforcement
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # RECIPES TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        category TEXT,
        instructions TEXT
    )
    """)

    # STREAMLINED INGREDIENTS TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_name TEXT,
        ingredient_name TEXT
    )
    """)

    # MEAL PLAN TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meal_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week TEXT,
        slot TEXT,
        recipe_name TEXT,
        UNIQUE(day_of_week, slot)
    )
    """)

    # STRENGTH WORKOUTS LOG
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS strength (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        exercise TEXT,
        weight REAL,
        sets INTEGER,
        reps INTEGER
    )
    """)

    # CARDIO WORKOUTS LOG
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cardio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        activity TEXT,
        duration_mins REAL,
        distance_km REAL
    )
    """)

    # WORKOUT TEMPLATES TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workout_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
    )
    """)

    # TEMPLATE EXERCISES MAP TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS template_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_name TEXT,
        exercise_name TEXT
    )
    """)

    # WEEKLY ROTATION PLAN TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weekly_workout_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week TEXT UNIQUE,
        template_name TEXT
    )
    """)

    # SMART TASK DISTRIBUTOR TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        due_date TEXT,
        target_date TEXT,
        est_hours REAL,
        actual_hours_spent REAL DEFAULT 0.0,
        is_completed INTEGER DEFAULT 0
    )
    """)
    
    # RUN MIGRATIONS FOR TASKS ENGINE TO ENFORCE COMPATIBILITY
    cursor.execute("PRAGMA table_info(tasks)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'notes' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT ''")
    if 'actual_hours_spent' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN actual_hours_spent REAL DEFAULT 0.0")
        
    # TASK CHECKLIST TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS task_checklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        item_name TEXT,
        is_completed INTEGER DEFAULT 0
    )
    """)
    
    conn.commit()
    return conn

conn = init_db()
cursor = conn.cursor()

# ==============================================================================
# HELPER LOGIC: DATE FORMATTING & VELOCITY ALGORITHM
# ==============================================================================
def format_to_swiss(date_str):
    """Safely converts standard ISO date string (YYYY-MM-DD) to Swiss format (DD.MM.YYYY)"""
    if not date_str:
        return ""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%d.%m.%Y")
    except (ValueError, TypeError):
        try:
            dt = datetime.strptime(date_str.split()[0], "%Y-%m-%d")
            return dt.strftime("%d.%m.%Y")
        except Exception:
            return date_str

def calculate_historical_velocity():
    """Calculates milestone completion velocity (Total Completed Milestones / Total Milestones Ever Logged)"""
    cursor.execute("SELECT COUNT(*) FROM task_checklist WHERE is_completed = 1")
    completed = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM task_checklist")
    total = cursor.fetchone()[0] or 0
    
    if total == 0:
        return 1.0  # Default 100% baseline efficiency when no milestones exist
    return round(completed / total, 2)

def get_distributed_task_milestones_for_date(target_date_obj):
    """Calculates daily checklist milestone allocations needed to meet target project dates"""
    tasks_df = pd.read_sql_query("SELECT * FROM tasks WHERE is_completed = 0", conn)
    daily_allocations = []
    
    for _, task in tasks_df.iterrows():
        try:
            task_target = datetime.strptime(task['target_date'], "%Y-%m-%d").date()
            today = date.today()
            if today <= target_date_obj <= task_target:
                days_remaining = (task_target - today).days + 1
                if days_remaining > 0:
                    # Query active milestones count
                    cursor.execute("""
                        SELECT COUNT(*), SUM(is_completed) 
                        FROM task_checklist 
                        WHERE task_id = ?
                    """, (task['id'],))
                    res = cursor.fetchone()
                    total_milestones = res[0] or 0
                    completed_milestones = res[1] or 0
                    
                    incomplete_milestones = total_milestones - completed_milestones
                    
                    # If no specific checklist items exist, represent the task itself as 1 milestone
                    if total_milestones == 0:
                        incomplete_milestones = 1
                        total_milestones = 1
                        completed_milestones = 0
                    
                    # Compute allocation density per day
                    base_density = incomplete_milestones / days_remaining
                    milestones_today = round(base_density, 1)
                    
                    notes_val = task['notes'] if 'notes' in task and pd.notna(task['notes']) else ""
                    
                    daily_allocations.append({
                        "task_id": task['id'],
                        "task_name": task['name'],
                        "milestones_count": milestones_today,
                        "incomplete_milestones": incomplete_milestones,
                        "total_milestones": total_milestones,
                        "completed_milestones": completed_milestones,
                        "due_date": task['due_date'],
                        "notes": notes_val
                    })
        except ValueError: 
            continue
    return daily_allocations

# ==============================================================================
# NAVIGATION & DISPLAY STATE MANAGEMENT
# ==============================================================================
if "current_page" not in st.session_state:
    st.session_state["current_page"] = "Main Hub"
if "editing_workout_id" not in st.session_state:
    st.session_state["editing_workout_id"] = None
if "num_strength_rows" not in st.session_state:
    st.session_state["num_strength_rows"] = 5

def navigate_to(page_name):
    st.session_state["current_page"] = page_name
    st.rerun()

# ==============================================================================
# INJECT HUD SYSTEM GRAPHICS OVERRIDE
# ==============================================================================
inject_hud_styling()

# ==============================================================================
# SCREEN: MAIN HUB (THE MULTI-COLUMN DASHBOARD)
# ==============================================================================
if st.session_state["current_page"] == "Main Hub":
    # Custom tech block title
    st.markdown("""
    <div class="hud-title-bar">
        <h1 style="margin: 0; padding: 0; border: none;">SUMMIT COMMAND CENTER</h1>
        <p class="hud-caption">CORE INTERFACE MATRIX // SYSTEM MODULES ONLINE</p>
    </div>
    """, unsafe_allow_html=True)
    
    nav_col1, nav_col2, nav_col3 = st.columns(3)
    if nav_col1.button("COOKBOOK AND MEALS", use_container_width=True): navigate_to("Recipe Dashboard")
    if nav_col2.button("FITNESS AND WORKOUTS", use_container_width=True): navigate_to("Fitness Dashboard")
    if nav_col3.button("TASK DISTRIBUTOR", use_container_width=True): navigate_to("Task Dashboard")
    
    st.markdown("---")
    left_main, right_sidebar = st.columns(2)
    
    with left_main:
        st.subheader("TODAY'S OPERATIONAL MATRIX")
        today_date = date.today()
        today_day = today_date.strftime("%A")
        st.markdown(f'<p class="hud-caption">TIMELINE REF: <strong>{today_day.upper()}</strong> | STAMP: {today_date.strftime("%d.%m.%Y")}</p>', unsafe_allow_html=True)
        
        st.markdown("#### FUEL DEPLOYED TO DATE:")
        meal_query = pd.read_sql_query("SELECT slot, recipe_name FROM meal_plan WHERE day_of_week=? AND recipe_name != 'None'", conn, params=(today_day,))
        
        if not meal_query.empty:
            for _, row in meal_query.iterrows():
                prefix = "[Special Option]" if row['recipe_name'] == "Flight" else "-"
                st.markdown(f"{prefix} **{row['slot']}:** `{row['recipe_name']}`")
        else:
            st.info("No nutrition maps set for today's operational window.")
        
        st.markdown("---")
        
        # Pulls live scheduled routines directly from the rotational planner map
        fit_query = pd.read_sql_query("SELECT template_name FROM weekly_workout_plan WHERE day_of_week=?", conn, params=(today_day,))
        if not fit_query.empty and fit_query.iloc[0]['template_name'] not in ['None', 'Rest Day']:
            template_name = fit_query.iloc[0]['template_name']
            st.success(f"PHYSICAL WORKOUT ACTIVE: {template_name}")
            
            ex_df = pd.read_sql_query("SELECT exercise_name FROM template_exercises WHERE template_name=?", conn, params=(template_name,))
            if not ex_df.empty:
                with st.expander("Inspect Target Exercises List"):
                    for _, ex_row in ex_df.iterrows():
                        st.write(f"- {ex_row['exercise_name']}")
        else: 
            st.info("No formal physical routines assigned to this period.")
            
        st.markdown("---")
        st.markdown("#### MILESTONE TARGET CHUNKS (TODAY):")
        today_chunks = get_distributed_task_milestones_for_date(today_date)
        if today_chunks:
            for chunk in today_chunks:
                swiss_due = format_to_swiss(chunk['due_date'])
                with st.expander(f"[TASK] {chunk['task_name']} — Target: {chunk['milestones_count']} Milestones (Due: {swiss_due})"):
                    if chunk['notes']:
                        st.markdown("**Core Specifications:**")
                        st.info(chunk['notes'])
                    else:
                        st.caption("No manual operational specs appended to this process.")
                        
                    checklist_df = pd.read_sql_query("SELECT * FROM task_checklist WHERE task_id=?", conn, params=(chunk['task_id'],))
                    if not checklist_df.empty:
                        st.markdown("**Process Sub-checks:**")
                        for _, item in checklist_df.iterrows():
                            is_checked = st.checkbox(item['item_name'], value=bool(item['is_completed']), key=f"hub_check_{item['id']}")
                            if is_checked != bool(item['is_completed']):
                                cursor.execute("UPDATE task_checklist SET is_completed=? WHERE id=?", (int(is_checked), item['id']))
                                conn.commit()
                                st.rerun()
                    else:
                        st.caption("No custom milestone metrics logged. Mark completed via the Task Dashboard.")
        else: 
            st.write("Zero milestone allocations queued for this timeline branch.")

    with right_sidebar:
        st.subheader("UPCOMING SCHEDULE")
        for i in range(1, 4):
            future_date = date.today() + timedelta(days=i)
            future_day = future_date.strftime("%A")
            with st.container(border=True):
                st.markdown(f"##### {future_day.upper()} ({future_date.strftime('%d.%m')})")
                
                f_meal_query = pd.read_sql_query("SELECT slot, recipe_name FROM meal_plan WHERE day_of_week=? AND recipe_name != 'None'", conn, params=(future_day,))
                if not f_meal_query.empty:
                    summary_list = [f"{r['slot']}: {r['recipe_name']}" for _, r in f_meal_query.iterrows()]
                    st.markdown("Food: " + ", ".join(summary_list))
                else:
                    st.markdown("Food: System Idle")
                    
                f_fit_query = pd.read_sql_query("SELECT template_name FROM weekly_workout_plan WHERE day_of_week=?", conn, params=(future_day,))
                f_workout = f_fit_query.iloc[0]['template_name'] if not f_fit_query.empty else "Rest Day"
                
                f_chunks = get_distributed_task_milestones_for_date(future_date)
                total_milestones = sum(c['milestones_count'] for c in f_chunks)
                st.markdown(f"Workout: {f_workout}")
                st.markdown(f"Tasks: {total_milestones} milestones scheduled")

# ==============================================================================
# MODULE: SMART TASK DISTRIBUTOR MANAGEMENT (HERO FEATURE)
# ==============================================================================
elif st.session_state["current_page"] == "Task Dashboard":
    st.markdown("""
    <div class="hud-title-bar">
        <h1 style="margin: 0; padding: 0; border: none;">TASK DISTRIBUTOR</h1>
        <p class="hud-caption">PREDICTIVE MILESTONE ENGINE // BACKLOG ALLOCATION GENERATOR</p>
    </div>
    """, unsafe_allow_html=True)
    if st.button("BACK TO MAIN HUB"): navigate_to("Main Hub")
    st.markdown("---")

    # PREDICTIVE METRICS TOP BAR
    v_mod = calculate_historical_velocity()
    m_col1, m_col2, m_col3 = st.columns(3)
    with m_col1:
        st.metric(
            label="Historical Milestone Completion Velocity", 
            value=f"{int(v_mod * 100)}%", 
            delta="Engine Running Optimal" if v_mod >= 0.8 else "Backlog Burn Rate Warning", 
            delta_color="normal" if v_mod >= 0.8 else "inverse"
        )
    with m_col2:
        today_chunks = get_distributed_task_milestones_for_date(date.today())
        total_load = sum(c['milestones_count'] for c in today_chunks)
        st.metric(label="Milestones Due Today", value=f"{total_load} Tasks")
    with m_col3:
        pending_count = pd.read_sql_query("SELECT COUNT(*) as count FROM tasks WHERE is_completed = 0", conn).iloc[0]['count']
        st.metric(label="Backlog Vector Horizons", value=f"{pending_count} Active")

    st.markdown("---")
    t_col1, t_col2 = st.columns(2)
    
    with t_col1:
        st.subheader("CREATE NEW PROJECT")
        t_name = st.text_input("Operational Task Designation Name", key="new_task_name")
        
        c1, c2 = st.columns(2)
        t_due = c1.date_input("Hard Milestone Deadline", key="new_task_due")
        t_target = c2.date_input("Soft Buffer Target Wrap Date", key="new_task_target")
        
        t_notes = st.text_area("Vector Target Specifications / Details", key="new_task_notes")
        t_checklist_text = st.text_area("Inject checklist milestones (One directive per line)", key="new_task_checklist")
        
        if st.button("ADD TO QUEUE", use_container_width=True):
            if t_name and t_target >= date.today():
                cursor.execute("""
                    INSERT INTO tasks (name, due_date, target_date, est_hours, notes) 
                    VALUES (?, ?, ?, ?, ?)
                """, (t_name, str(t_due), str(t_target), 1.0, t_notes))
                task_id = cursor.lastrowid
                
                if t_checklist_text:
                    for line in t_checklist_text.split("\n"):
                        if line.strip():
                            cursor.execute("INSERT INTO task_checklist (task_id, item_name) VALUES (?, ?)", 
                                           (task_id, line.strip()))
                
                conn.commit()
                st.success(f"Successfully compiled baseline vector '{t_name}'!")
                st.rerun()
            else: 
                st.error("Matrix compilation error: verify parameters and date orientation.")

    with t_col2:
        st.subheader("SYSTEM BACKLOG AND ACTIVE RUNTIMES")
        tasks_df = pd.read_sql_query("SELECT * FROM tasks WHERE is_completed = 0", conn)
        
        if not tasks_df.empty:
            for _, row in tasks_df.iterrows():
                swiss_target = format_to_swiss(row['target_date'])
                
                # Fetch sub-milestones checklist
                checklist_items = pd.read_sql_query("SELECT * FROM task_checklist WHERE task_id=?", 
                                                    conn, params=(row['id'],))
                total_checklist_count = len(checklist_items)
                completed_checklist_count = len(checklist_items[checklist_items['is_completed'] == 1]) if total_checklist_count > 0 else 0
                
                progress_val = completed_checklist_count / total_checklist_count if total_checklist_count > 0 else 0.0
                
                # Expandable view housing the in-line interactive modifier form
                with st.expander(f"Task Editor: {row['name']} ({completed_checklist_count}/{total_checklist_count} Completed) — Target: {swiss_target}"):
                    
                    st.write("Project Milestone Completion Index:")
                    st.progress(progress_val)
                    
                    # --- INTERACTIVE EDIT FIELDS ---
                    edit_name = st.text_input("Modify Operational Identifier", value=row['name'], key=f"edit_name_{row['id']}")
                    
                    ec1, ec2 = st.columns(2)
                    curr_due = datetime.strptime(row['due_date'], "%Y-%m-%d").date() if row['due_date'] else date.today()
                    curr_target = datetime.strptime(row['target_date'], "%Y-%m-%d").date() if row['target_date'] else date.today()
                    
                    edit_due = ec1.date_input("Shift Hard Deadline", value=curr_due, key=f"edit_due_{row['id']}")
                    edit_target = ec2.date_input("Shift Target Horizon", value=curr_target, key=f"edit_target_{row['id']}")
                    
                    raw_notes = row['notes'] if row.get('notes') and pd.notna(row['notes']) else ""
                    edit_notes = st.text_area("Overwrite Functional Specifications", value=raw_notes, key=f"edit_notes_{row['id']}")
                    
                    # --- ACTION BUTTONS FOR EDITING ---
                    save_edits_col, delete_task_col = st.columns(2)
                    
                    with save_edits_col:
                        if st.button("SAVE CHANGES", key=f"save_edits_{row['id']}", use_container_width=True):
                            cursor.execute("""
                                UPDATE tasks 
                                SET name=?, due_date=?, target_date=?, notes=? 
                                WHERE id=?
                            """, (edit_name, str(edit_due), str(edit_target), edit_notes, row['id']))
                            conn.commit()
                            st.success("Target node values updated successfully!")
                            st.rerun()
                            
                    with delete_task_col:
                        if st.button("DELETE TASK", key=f"del_task_{row['id']}", use_container_width=True):
                            cursor.execute("DELETE FROM tasks WHERE id=?", (row['id'],))
                            cursor.execute("DELETE FROM task_checklist WHERE task_id=?", (row['id'],))
                            conn.commit()
                            st.warning("Target metrics purged from memory matrix.")
                            st.rerun()

                    st.markdown("---")
                    st.markdown("##### SUB-HORIZON CRITERIA")
                    if not checklist_items.empty:
                        for _, item in checklist_items.iterrows():
                            is_checked = st.checkbox(item['item_name'], value=bool(item['is_completed']), 
                                                    key=f"check_{item['id']}")
                            if is_checked != bool(item['is_completed']):
                                cursor.execute("UPDATE task_checklist SET is_completed=? WHERE id=?", 
                                               (int(is_checked), item['id']))
                                conn.commit()
                                st.rerun()
                    else:
                        st.caption("No sub-process directives recorded. You can add them in the main creation tab.")
                                
                    st.markdown("---")
                    st.markdown("##### COMPLETE TASK AND ARCHIVE")
                    st.write("Completing this task will finalize all checklist milestones.")
                    
                    if st.button("COMPLETE TASK AND ARCHIVE PROFILE", key=f"complete_{row['id']}", use_container_width=True):
                        # Force mark all its checklists completed as well
                        cursor.execute("UPDATE task_checklist SET is_completed = 1 WHERE task_id = ?", (row['id'],))
                        cursor.execute("UPDATE tasks SET is_completed = 1 WHERE id = ?", (row['id'],))
                        conn.commit()
                        st.success("Milestone achieved. Integration of target performance metrics successful!")
                        st.rerun()
        else: 
            st.info("System operational backlog is empty.")

    st.markdown("---")
    st.subheader("WORKLOAD HORIZON (14-DAY FORECAST)")
    
    workload_data = []
    for i in range(14):
        target_d = date.today() + timedelta(days=i)
        chunks = get_distributed_task_milestones_for_date(target_d)
        total_milestones = sum(c['milestones_count'] for c in chunks)
        workload_data.append({"Date": target_d.strftime("%d.%m.%Y"), "Milestones Due": total_milestones, "Day": target_d.strftime("%a")})
        
    wl_df = pd.DataFrame(workload_data)
    
    dash_col1, dash_col2 = st.columns([2, 1])
    with dash_col1:
        st.bar_chart(wl_df.set_index("Date")["Milestones Due"])
    with dash_col2:
        st.dataframe(wl_df[["Day", "Date", "Milestones Due"]], use_container_width=True, hide_index=True)

# ==============================================================================
# MODULE: RECIPE BOOK & COOKBOOK
# ==============================================================================
elif st.session_state["current_page"] == "Recipe Dashboard":
    st.markdown("""
    <div class="hud-title-bar">
        <h1 style="margin: 0; padding: 0; border: none;">NUTRITION PLANNER</h1>
        <p class="hud-caption">NUTRITION PLANNER // RESOURCE INVENTORY AND MEALS</p>
    </div>
    """, unsafe_allow_html=True)
    if st.button("RETURN TO HUB OPERATIONS"): navigate_to("Main Hub")
    st.markdown("---")
    if st.button("VIEW COOKBOOK", use_container_width=True): navigate_to("View Cookbook")
    if st.button("ADD A NEW RECIPE", use_container_width=True): navigate_to("Add a Recipe")
    if st.button("WEEKLY MEAL PLANNER", use_container_width=True): navigate_to("Weekly Meal Planner")

elif st.session_state["current_page"] == "Add a Recipe":
    st.title("ADD NEW RECIPE")
    if st.button("BACK TO DASHBOARD"): navigate_to("Recipe Dashboard")
    st.markdown("---")
    name = st.text_input("Ingestion Designation Target ID (Recipe Name)")
    category = st.selectbox("Resource Classification Vector", ["Breakfast", "Meal", "Snacks", "Desserts"])
    
    ingredients_input = st.text_area("Critical Component Inventory (One per line)")
    instructions = st.text_area("Synthesizing Protocols (Cooking Steps)")
    
    if st.button("SAVE TO COOKBOOK", use_container_width=True):
        if name and ingredients_input and instructions:
            try:
                cursor.execute("INSERT INTO recipes (name, category, instructions) VALUES (?, ?, ?)", (name, category, instructions))
                for line in ingredients_input.split("\n"):
                    cleaned_ingredient = line.strip().title()
                    if cleaned_ingredient:
                        cursor.execute("INSERT INTO recipe_ingredients (recipe_name, ingredient_name) VALUES (?, ?)", (name, cleaned_ingredient))
                conn.commit()
                st.success(f"System node configuration: Synthesizing parameters for '{name}' finalized!")
                st.rerun()
            except sqlite3.IntegrityError: 
                st.error("Operation Collision Detected: Ingestion configuration profile already exists inside core databases.")
        else: 
            st.error("Incomplete system validation: fill out all configuration sectors.")

elif st.session_state["current_page"] == "View Cookbook":
    st.title("MY RECIPES")
    if st.button("BACK TO DASHBOARD"): navigate_to("Recipe Dashboard")
    st.markdown("---")
    recipes_df = pd.read_sql_query("SELECT * FROM recipes", conn)
    if len(recipes_df) > 0:
        recipe_list = recipes_df["name"].tolist()
        selected_recipe = st.selectbox("Inspect Target Blueprint Model:", recipe_list)
        recipe_data = recipes_df[recipes_df["name"] == selected_recipe].iloc[0]
        st.subheader(f"BLUEPRINT SCHEMA: {recipe_data['name'].upper()}")
        st.caption(f"VECTOR SEGMENT: {recipe_data['category']}")
        
        st.write("### SPECIFIED REAGENTS")
        ing_df = pd.read_sql_query("SELECT ingredient_name FROM recipe_ingredients WHERE recipe_name=?", conn, params=(selected_recipe,))
        for _, ing in ing_df.iterrows():
            st.write(f"- {ing['ingredient_name']}")
            
        st.write("### CONSTRUCT PROCESS PROTOCOL")
        st.write(recipe_data["instructions"])
    else: 
        st.info("System Storage Empty: Log blueprints to run register check.")

elif st.session_state["current_page"] == "Weekly Meal Planner":
    st.title("WEEKLY MEAL PLANNER")
    if st.button("BACK TO DASHBOARD"): navigate_to("Recipe Dashboard")
    st.markdown("---")
    
    recipes_df = pd.read_sql_query("SELECT * FROM recipes", conn)
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    slots = ["Breakfast", "Meal 1", "Meal 2", "Snack 1", "Snack 2"]
    
    recipe_options = ["None", "Flight"] + (recipes_df["name"].tolist() if len(recipes_df) > 0 else [])
    
    st.write("### CHRONOLOGICAL DEPLOYMENT MAPPING")
    day_tabs = st.tabs(days)
    
    with st.form("meal_form"):
        selections = {}
        
        for index, day in enumerate(days):
            with day_tabs[index]:
                st.markdown(f"#### {day.upper()} SECTORS")
                for slot in slots:
                    existing = pd.read_sql_query("SELECT recipe_name FROM meal_plan WHERE day_of_week=? AND slot=?", conn, params=(day, slot))
                    default_val = existing.iloc[0]["recipe_name"] if not existing.empty else "None"
                    if default_val not in recipe_options: default_val = "None"
                    
                    selections[(day, slot)] = st.selectbox(
                        f"Assign Resource for {slot}:", 
                        recipe_options, 
                        index=recipe_options.index(default_val),
                        key=f"{day}_{slot}"
                    )
        
        if st.form_submit_button("SAVE WEEKLY PLAN", use_container_width=True):
            for (day, slot), meal in selections.items():
                cursor.execute("""
                INSERT INTO meal_plan (day_of_week, slot, recipe_name) 
                VALUES (?, ?, ?) 
                ON CONFLICT(day_of_week, slot) 
                DO UPDATE SET recipe_name=excluded.recipe_name
                """, (day, slot, meal))
            conn.commit()
            st.success("Rotational scheduler updated and broadcast across HUD systems!")
            st.rerun()

    st.markdown("---")
    st.subheader("AUTO-GENERATED SHOPPING LIST")
    
    ingredients_query = """
    SELECT ri.ingredient_name 
    FROM meal_plan mp
    JOIN recipe_ingredients ri ON mp.recipe_name = ri.recipe_name
    WHERE mp.recipe_name NOT IN ('None', 'Flight') AND mp.recipe_name IS NOT NULL
    """
    all_needed_ingredients = pd.read_sql_query(ingredients_query, conn)
    
    if not all_needed_ingredients.empty:
        frequency_counts = all_needed_ingredients["ingredient_name"].value_counts().reset_index()
        frequency_counts.columns = ["ingredient_name", "meals_count"]
        frequency_counts = frequency_counts.sort_values("ingredient_name")
        
        st.write("Below is your system procurement checklist:")
        for _, item in frequency_counts.iterrows():
            st.checkbox(f"**{item['ingredient_name']}** ({item['meals_count']}x Deployed in Matrix)")
    else:
        st.info("System idle: map blueprints inside the rotational scheduler to load inventory requirements.")

# ==============================================================================
# MODULE: GYM FITNESS INTERFACE
# ==============================================================================
elif st.session_state["current_page"] == "Fitness Dashboard":
    st.markdown("""
    <div class="hud-title-bar">
        <h1 style="margin: 0; padding: 0; border: none;">FITNESS COMMAND CENTER</h1>
        <p class="hud-caption">PHYSICAL MATRIX // PERFORMANCE LOGS AND BLUEPRINTS</p>
    </div>
    """, unsafe_allow_html=True)
    if st.button("DISCONNECT BACK TO MAIN HUB"): 
        st.session_state["editing_workout_id"] = None
        navigate_to("Main Hub")
        
    strength_data = pd.read_sql_query("SELECT * FROM strength", conn)
    cardio_data = pd.read_sql_query("SELECT * FROM cardio", conn)
    
    total_lifts_logged = len(strength_data)
    total_cardio_logged = len(cardio_data)
    
    total_volume_kg = int((strength_data['weight'] * strength_data['sets'] * strength_data['reps']).sum()) if not strength_data.empty else 0
    total_cardio_mins = int(cardio_data['duration_mins'].sum()) if not cardio_data.empty else 0
    
    st.markdown("---")
    tile_col1, tile_col2, tile_col3 = st.columns(3)
    
    with tile_col1:
        st.metric(label="CUMULATIVE KINETIC MASS VOLUME", value=f"{total_volume_kg:,} kg", delta="Force Matrix Stable")
    with tile_col2:
        st.metric(label="AEROBIC KINETIC OUTPUT", value=f"{total_cardio_mins} mins", delta="Mitochondrial Load Active")
    with tile_col3:
        st.metric(label="VERIFIED PHYSICAL DATA PACKETS", value=total_lifts_logged + total_cardio_logged, delta="Bio-Telemetry Normal")
        
    st.markdown("---")
    control_left, control_right = st.columns(2)
    
    with control_left:
        st.subheader("SYSTEM LOADS AND BIO-ROUTINES")
        action_mode = st.selectbox(
            "Select Physical System Input Configuration Mode:",
            ["Predefined Workout Template Builder", "Weekly Fitness Scheduler Matrix", "Log Manual Cardio Deck Session"]
        )
        
        # SUB-MODULE 1: TEMPLATE BUILDER
        if action_mode == "Predefined Workout Template Builder":
            st.write("### PREDEFINED STRUCTURAL BLUEPRINT CONSTRUCTOR")
            st.caption("Establish physical routine arrays for automated scheduling on the Command Matrix.")
            
            new_tmpl_name = st.text_input("Routine Designation ID (e.g., Pull Day, Lower Deck A)")
            tmpl_exercises_text = st.text_area("Log Exercises Sequence Matrix (Type one item per line)")
            
            if st.button("ENCODE SYSTEM BLUEPRINT DATA RECORD", use_container_width=True):
                if new_tmpl_name and tmpl_exercises_text:
                    try:
                        cursor.execute("INSERT INTO workout_templates (name) VALUES (?)", (new_tmpl_name.strip(),))
                        for line in tmpl_exercises_text.split("\n"):
                            cleaned_exercise = line.strip().title()
                            if cleaned_exercise:
                                cursor.execute("INSERT INTO template_exercises (template_name, exercise_name) VALUES (?, ?)", (new_tmpl_name.strip(), cleaned_exercise))
                        conn.commit()
                        st.success(f"System profile '{new_tmpl_name}' compiled successfully!")
                        st.rerun()
                    except sqlite3.IntegrityError:
                        st.error("Operation Aborted: Schema collision -- Target designation profile already active.")
                else: 
                    st.error("System validation warning: check active configuration values.")
            
            st.markdown("---")
            st.write("### COMPILATION CHECK: REGISTERED BLUEPRINTS")
            all_saved_tmpl = pd.read_sql_query("SELECT * FROM workout_templates", conn)
            if not all_saved_tmpl.empty:
                for _, t_row in all_saved_tmpl.iterrows():
                    with st.container(border=True):
                        disp_col1, disp_col2 = st.columns([3, 1])
                        with disp_col1:
                            st.markdown(f"**{t_row['name'].upper()}**")
                            ex_items_df = pd.read_sql_query("SELECT exercise_name FROM template_exercises WHERE template_name=?", conn, params=(t_row['name'],))
                            st.caption("Array elements: " + ", ".join(ex_items_df["exercise_name"].tolist()))
                        with disp_col2:
                            if st.button("REMOVE RECORD", key=f"del_tmpl_{t_row['id']}", use_container_width=True):
                                cursor.execute("DELETE FROM workout_templates WHERE id=?", (t_row['id'],))
                                cursor.execute("DELETE FROM template_exercises WHERE template_name=?", (t_row['name'],))
                                conn.commit()
                                st.warning("Blueprint metrics removed.")
                                st.rerun()
            else: 
                st.caption("No custom physical architectures stored.")

        # SUB-MODULE 2: ROTATIONAL WEEKLY PLANNER
        elif action_mode == "Weekly Fitness Scheduler Matrix":
            st.write("### CHRONO-ROTATIONAL SCHEDULER MATRIX")
            st.caption("Map custom structural routines to structural diurnal modules. Live broadcast on primary HUD.")
            
            saved_templates_df = pd.read_sql_query("SELECT name FROM workout_templates", conn)
            available_templates = ["None", "Rest Day"] + saved_templates_df["name"].tolist()
            days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            weekly_selections = {}
            for d in days_of_week:
                existing_mapping = pd.read_sql_query("SELECT template_name FROM weekly_workout_plan WHERE day_of_week=?", conn, params=(d,))
                default_tmpl = existing_mapping.iloc[0]["template_name"] if not existing_mapping.empty else "None"
                if default_tmpl not in available_templates: default_tmpl = "None"
                
                weekly_selections[d] = st.selectbox(f"Set Routine for {d.upper()}:", available_templates, index=available_templates.index(default_tmpl), key=f"weekly_select_{d}")
            
            if st.button("ENCODE ROTATIONAL DIRECTIVES", use_container_width=True):
                for d, tmpl in weekly_selections.items():
                    cursor.execute("""
                    INSERT INTO weekly_workout_plan (day_of_week, template_name)
                    VALUES (?, ?)
                    ON CONFLICT(day_of_week)
                    DO UPDATE SET template_name=excluded.template_name
                    """, (d, tmpl))
                conn.commit()
                st.success("Target weekly matrix mapped and locked!")
                st.rerun()

        # SUB-MODULE 3: CARDIO ENGINE MANUAL ENTRY
        elif action_mode == "Log Manual Cardio Deck Session":
            date_val = st.date_input("Tactical Operation Date", date.today())
            activity = st.selectbox("Select Aerobic Module Engine:", ["Running", "Cycling", "Swimming", "Rowing Machine"])
            duration = st.slider("Session Duration Output (Minutes):", min_value=1.0, max_value=180.0, value=30.0)
            distance = st.number_input("Spatial Displacement Vector Range (KM)", min_value=0.0, step=0.1, value=5.0)
            
            if st.button("BROADCAST CARDIO TELEMETRY DATA TO HUD DATABASE", use_container_width=True):
                cursor.execute("INSERT INTO cardio (date, activity, duration_mins, distance_km) VALUES (?, ?, ?, ?)", (str(date_val), activity, duration, distance))
                conn.commit()
                st.success(f"Transmission successful: Deployed {activity} telemetry metrics.")
                st.rerun()

    with control_right:
        st.subheader("CHRONOLOGICAL DATABASES")
        hist_choice = st.radio("Query Target Bio-Telemetry Module Repository:", ["Logged Strength History Sets", "Logged Cardio Runs"], horizontal=True)
        
        if hist_choice == "Logged Strength History Sets" and not strength_data.empty:
            st.dataframe(strength_data[["id", "date", "exercise", "sets", "reps", "weight"]].sort_values("date", ascending=False), use_container_width=True, hide_index=True)
        elif hist_choice == "Logged Cardio Runs" and not cardio_data.empty:
            st.dataframe(cardio_data[["id", "date", "activity", "duration_mins", "distance_km"]].sort_values("date", ascending=False), use_container_width=True, hide_index=True)
        else:
            st.caption("No historical feedback loops verified inside the relational database core.")
            
        st.markdown("---")
        st.write("### PURGE TRACKING RECORD PACKET")
        st.caption("Enter the exact operational index row ID to wipe historical values from memory storage.")
        
        target_purge_id = st.number_input("Node Row ID Vector Value to Terminate", min_value=1, value=1, step=1, key="purge_id_input")
        
        if st.button("PURGE PAST WORKOUT LOG", use_container_width=True):
            if hist_choice == "Logged Strength History Sets":
                cursor.execute("DELETE FROM strength WHERE id = ?", (target_purge_id,))
            else:
                cursor.execute("DELETE FROM cardio WHERE id = ?", (target_purge_id,))
            conn.commit()
            st.success(f"Data packet index ID {target_purge_id} cleared from tracking registry successfully.")
            st.rerun()