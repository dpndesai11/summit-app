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
# DATABASE INITIALIZATION & MIGRATION
# ==============================================================================
def init_db():
    conn = sqlite3.connect("summit.db", check_same_thread=False)
    cursor = conn.cursor()
    
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

    # FITNESS SCHEDULE TABLE
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fitness_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        title TEXT,
        drills TEXT
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
        is_completed INTEGER DEFAULT 0
    )
    """)
    
    # MIGRATION: ADD NOTES TO TASKS IF IT DOESN'T EXIST
    cursor.execute("PRAGMA table_info(tasks)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'notes' not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT ''")
        
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
# HELPER LOGIC: DATE FORMATTING & SMART ALGORITHM
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

def get_distributed_task_hours_for_date(target_date_obj):
    tasks_df = pd.read_sql_query("SELECT * FROM tasks WHERE is_completed = 0", conn)
    daily_allocations = []
    for _, task in tasks_df.iterrows():
        try:
            task_target = datetime.strptime(task['target_date'], "%Y-%m-%d").date()
            today = date.today()
            if today <= target_date_obj <= task_target:
                days_remaining = (task_target - today).days + 1
                if days_remaining > 0:
                    hours_today = round((task['est_hours'] / days_remaining) * 4) / 4
                    
                    notes_val = task['notes'] if 'notes' in task and pd.notna(task['notes']) else ""
                    
                    daily_allocations.append({
                        "task_id": task['id'],
                        "task_name": task['name'],
                        "hours": hours_today,
                        "due_date": task['due_date'],
                        "notes": notes_val
                    })
        except ValueError: continue
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
# SCREEN: MAIN HUB (THE MULTI-COLUMN DASHBOARD)
# ==============================================================================
if st.session_state["current_page"] == "Main Hub":
    st.title("Summit Command Center")
    
    nav_col1, nav_col2, nav_col3 = st.columns(3)
    if nav_col1.button("Cookbook and Meals", use_container_width=True): navigate_to("Recipe Dashboard")
    if nav_col2.button("Fitness and Workouts", use_container_width=True): navigate_to("Fitness Dashboard")
    if nav_col3.button("Task Distributor", use_container_width=True): navigate_to("Task Dashboard")
    
    st.markdown("---")
    left_main, right_sidebar = st.columns(2)
    
    with left_main:
        st.subheader("Today's Blueprint")
        today_date = date.today()
        today_day = today_date.strftime("%A")
        # Displaying with Swiss date formatting (e.g. Wednesday | 17.06.2026)
        st.caption(f"**{today_day}** | {today_date.strftime('%d.%m.%Y')}")
        
        st.markdown("#### Today's Menu Timeline:")
        meal_query = pd.read_sql_query("SELECT slot, recipe_name FROM meal_plan WHERE day_of_week=? AND recipe_name != 'None'", conn, params=(today_day,))
        
        if not meal_query.empty:
            for _, row in meal_query.iterrows():
                prefix = "[Flight Option]" if row['recipe_name'] == "Flight" else "-"
                st.markdown(f"{prefix} **{row['slot']}:** `{row['recipe_name']}`")
        else:
            st.info("No meals planned for today yet.")
        
        st.markdown("---")
        fit_query = pd.read_sql_query("SELECT * FROM fitness_schedule WHERE date=?", conn, params=(str(today_date),))
        if not fit_query.empty:
            st.success(f"Workout Scheduled: {fit_query.iloc[0]['title']}")
            with st.expander("View Target Drills"): st.write(fit_query.iloc[0]['drills'])
        else: st.info("No formal workouts mapped for today.")
            
        st.markdown("---")
        st.markdown("#### Smart Work Chunks For Today:")
        today_chunks = get_distributed_task_hours_for_date(today_date)
        if today_chunks:
            for chunk in today_chunks:
                swiss_due = format_to_swiss(chunk['due_date'])
                # Interactive expander for tasks on the main hub
                with st.expander(f"📌 {chunk['task_name']} — Allocate {chunk['hours']} hrs (Due: {swiss_due})"):
                    if chunk['notes']:
                        st.markdown("**Notes:**")
                        st.info(chunk['notes'])
                    else:
                        st.caption("No notes attached to this task.")
                        
                    # Fetch checklist specific to this task
                    checklist_df = pd.read_sql_query("SELECT * FROM task_checklist WHERE task_id=?", conn, params=(chunk['task_id'],))
                    if not checklist_df.empty:
                        st.markdown("**Checklist:**")
                        for _, item in checklist_df.iterrows():
                            # Allow checking off items directly from the Main Hub
                            is_checked = st.checkbox(item['item_name'], value=bool(item['is_completed']), key=f"hub_check_{item['id']}")
                            if is_checked != bool(item['is_completed']):
                                cursor.execute("UPDATE task_checklist SET is_completed=? WHERE id=?", (int(is_checked), item['id']))
                                conn.commit()
                                st.rerun()
        else: st.write("No active task work blocks allocated for today.")

    with right_sidebar:
        st.subheader("Next 3 Days")
        for i in range(1, 4):
            future_date = date.today() + timedelta(days=i)
            future_day = future_date.strftime("%A")
            with st.container(border=True):
                # Short Swiss date style (e.g. DD.MM)
                st.markdown(f"##### {future_day} ({future_date.strftime('%d.%m')})")
                
                f_meal_query = pd.read_sql_query("SELECT slot, recipe_name FROM meal_plan WHERE day_of_week=? AND recipe_name != 'None'", conn, params=(future_day,))
                if not f_meal_query.empty:
                    summary_list = [f"{r['slot']}: {r['recipe_name']}" for _, r in f_meal_query.iterrows()]
                    st.markdown("Meals: " + ", ".join(summary_list))
                else:
                    st.markdown("Meals: *No meals planned*")
                    
                f_fit_query = pd.read_sql_query("SELECT title FROM fitness_schedule WHERE date=?", conn, params=(str(future_date),))
                f_workout = f_fit_query.iloc[0]['title'] if not f_fit_query.empty else "Rest Day"
                f_chunks = get_distributed_task_hours_for_date(future_date)
                total_task_hours = sum(c['hours'] for c in f_chunks)
                st.markdown(f"Fit: {f_workout}")
                st.markdown(f"Tasks: {total_task_hours} hrs assigned")

# ==============================================================================
# MODULE: SMART TASK DISTRIBUTOR MANAGEMENT
# ==============================================================================
elif st.session_state["current_page"] == "Task Dashboard":
    st.title("Smart Task Distributor")
    if st.button("Back to Main Hub"): navigate_to("Main Hub")
    st.markdown("---")

    t_col1, t_col2 = st.columns(2)
    
    with t_col1:
        st.subheader("Add New Project")
        t_name = st.text_input("Task / Project Name")
        
        c1, c2 = st.columns(2)
        t_due = c1.date_input("Official Due Date")
        t_target = c2.date_input("Target Completion Date")
        
        t_hours = st.number_input("Estimated Total Hours", min_value=0.5, step=0.5)
        
        # New Inputs for Notes and Checklist
        t_notes = st.text_area("Task Notes & Details (Optional)")
        t_checklist_text = st.text_area("Checklist Items (Optional, one per line)")
        
        if st.button("Distribute Task Load", use_container_width=True):
            if t_name and t_target >= date.today():
                cursor.execute("""
                    INSERT INTO tasks (name, due_date, target_date, est_hours, notes) 
                    VALUES (?, ?, ?, ?, ?)
                """, (t_name, str(t_due), str(t_target), t_hours, t_notes))
                task_id = cursor.lastrowid
                
                # Save checklist items to DB
                if t_checklist_text:
                    for line in t_checklist_text.split("\n"):
                        if line.strip():
                            cursor.execute("INSERT INTO task_checklist (task_id, item_name) VALUES (?, ?)", 
                                           (task_id, line.strip()))
                
                conn.commit()
                st.success(f"Distributed '{t_name}'!")
                st.rerun()
            else: st.error("Invalid task data or past target date.")

    with t_col2:
        st.subheader("Active Horizons")
        tasks_df = pd.read_sql_query("SELECT * FROM tasks WHERE is_completed = 0", conn)
        if not tasks_df.empty:
            for _, row in tasks_df.iterrows():
                swiss_target = format_to_swiss(row['target_date'])
                with st.expander(f"Task: {row['name']} ({row['est_hours']} Hours)"):
                    st.write(f"**Target Wrap-up:** {swiss_target}")
                    
                    if row.get('notes') and pd.notna(row['notes']):
                        st.markdown("**Notes:**")
                        st.info(row['notes'])
                    
                    # Fetch and display checklist items
                    checklist_items = pd.read_sql_query("SELECT * FROM task_checklist WHERE task_id=?", 
                                                        conn, params=(row['id'],))
                    if not checklist_items.empty:
                        st.markdown("**Checklist:**")
                        for _, item in checklist_items.iterrows():
                            is_checked = st.checkbox(item['item_name'], value=bool(item['is_completed']), 
                                                    key=f"check_{item['id']}")
                            if is_checked != bool(item['is_completed']):
                                cursor.execute("UPDATE task_checklist SET is_completed=? WHERE id=?", 
                                               (int(is_checked), item['id']))
                                conn.commit()
                                st.rerun()
                                
                    st.markdown("---")
                    if st.button("Mark Task Completed", key=f"complete_{row['id']}"):
                        cursor.execute("UPDATE tasks SET is_completed = 1 WHERE id = ?", (row['id'],))
                        conn.commit()
                        st.success("Task completed!")
                        st.rerun()
        else: st.info("No active projects.")

    st.markdown("---")
    
    # NEW FEATURE: Workload Horizon Dashboard (Swiss Format dates)
    st.subheader("Workload Horizon (Next 14 Days)")
    st.caption("Visual representation of total task hours automatically distributed per day.")
    
    workload_data = []
    for i in range(14):
        target_d = date.today() + timedelta(days=i)
        chunks = get_distributed_task_hours_for_date(target_d)
        total_hours = sum(c['hours'] for c in chunks)
        # Using Swiss DD.MM.YYYY here
        workload_data.append({"Date": target_d.strftime("%d.%m.%Y"), "Hours Due": total_hours, "Day": target_d.strftime("%a")})
        
    wl_df = pd.DataFrame(workload_data)
    
    dash_col1, dash_col2 = st.columns([2, 1])
    with dash_col1:
        st.bar_chart(wl_df.set_index("Date")["Hours Due"])
    with dash_col2:
        st.dataframe(wl_df[["Day", "Date", "Hours Due"]], use_container_width=True, hide_index=True)

# ==============================================================================
# MODULE: RECIPE BOOK & COOKBOOK
# ==============================================================================
elif st.session_state["current_page"] == "Recipe Dashboard":
    st.title("Cookbook Dashboard")
    if st.button("Back to Main Hub"): navigate_to("Main Hub")
    st.markdown("---")
    if st.button("View My Cookbook", use_container_width=True): navigate_to("View Cookbook")
    if st.button("Add a New Recipe", use_container_width=True): navigate_to("Add a Recipe")
    if st.button("Weekly Meal Planner & Shopping List", use_container_width=True): navigate_to("Weekly Meal Planner")

elif st.session_state["current_page"] == "Add a Recipe":
    st.title("Add New Recipe")
    if st.button("Back to Cookbook Dashboard"): navigate_to("Recipe Dashboard")
    st.markdown("---")
    name = st.text_input("Recipe Name")
    category = st.selectbox("Category", ["Breakfast", "Meal", "Snacks", "Desserts"])
    
    ingredients_input = st.text_area("Ingredients List (Type one ingredient per line, e.g., Onion)")
    instructions = st.text_area("Cooking Instructions")
    
    if st.button("Save to Cookbook", use_container_width=True):
        if name and ingredients_input and instructions:
            try:
                cursor.execute("INSERT INTO recipes (name, category, instructions) VALUES (?, ?, ?)", (name, category, instructions))
                for line in ingredients_input.split("\n"):
                    cleaned_ingredient = line.strip().title()
                    if cleaned_ingredient:
                        cursor.execute("INSERT INTO recipe_ingredients (recipe_name, ingredient_name) VALUES (?, ?)", (name, cleaned_ingredient))
                conn.commit()
                st.success(f"'{name}' successfully added to your cookbook!")
                st.rerun()
            except sqlite3.IntegrityError: st.error("A recipe with this name already exists!")
        else: st.error("Please fill out all fields.")

elif st.session_state["current_page"] == "View Cookbook":
    st.title("My Recipes")
    if st.button("Back to Cookbook Dashboard"): navigate_to("Recipe Dashboard")
    st.markdown("---")
    recipes_df = pd.read_sql_query("SELECT * FROM recipes", conn)
    if len(recipes_df) > 0:
        recipe_list = recipes_df["name"].tolist()
        selected_recipe = st.selectbox("Choose a recipe:", recipe_list)
        recipe_data = recipes_df[recipes_df["name"] == selected_recipe].iloc[0]
        st.subheader(f"Recipe: {recipe_data['name']}")
        st.caption(f"Category: {recipe_data['category']}")
        
        st.write("### Ingredients")
        ing_df = pd.read_sql_query("SELECT ingredient_name FROM recipe_ingredients WHERE recipe_name=?", conn, params=(selected_recipe,))
        for _, ing in ing_df.iterrows():
            st.write(f"- {ing['ingredient_name']}")
            
        st.write("### Instructions")
        st.write(recipe_data["instructions"])
    else: st.info("Your cookbook is empty.")

elif st.session_state["current_page"] == "Weekly Meal Planner":
    st.title("Weekly Meal Planner")
    if st.button("Back to Cookbook Dashboard"): navigate_to("Recipe Dashboard")
    st.markdown("---")
    
    recipes_df = pd.read_sql_query("SELECT * FROM recipes", conn)
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    slots = ["Breakfast", "Meal 1", "Meal 2", "Snack 1", "Snack 2"]
    
    recipe_options = ["None", "Flight"] + (recipes_df["name"].tolist() if len(recipes_df) > 0 else [])
    
    st.write("### Map Out Your Plan")
    day_tabs = st.tabs(days)
    
    with st.form("meal_form"):
        selections = {}
        
        for index, day in enumerate(days):
            with day_tabs[index]:
                st.markdown(f"#### {day} Slots")
                for slot in slots:
                    existing = pd.read_sql_query("SELECT recipe_name FROM meal_plan WHERE day_of_week=? AND slot=?", conn, params=(day, slot))
                    default_val = existing.iloc[0]["recipe_name"] if not existing.empty else "None"
                    if default_val not in recipe_options: default_val = "None"
                    
                    selections[(day, slot)] = st.selectbox(
                        f"{slot}:", 
                        recipe_options, 
                        index=recipe_options.index(default_val),
                        key=f"{day}_{slot}"
                    )
        
        if st.form_submit_button("Save Weekly Plan", use_container_width=True):
            for (day, slot), meal in selections.items():
                cursor.execute("""
                INSERT INTO meal_plan (day_of_week, slot, recipe_name) 
                VALUES (?, ?, ?) 
                ON CONFLICT(day_of_week, slot) 
                DO UPDATE SET recipe_name=excluded.recipe_name
                """, (day, slot, meal))
            conn.commit()
            st.success("Weekly routine successfully updated!")
            st.rerun()

    st.markdown("---")
    st.subheader("Auto-Generated Shopping List")
    
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
        
        st.write("Below is your ingredient checklist (tally counts reflect total times used in all planned slots):")
        for _, item in frequency_counts.iterrows():
            st.checkbox(f"**{item['ingredient_name']}** ({item['meals_count']})")
    else:
        st.info("Assign scheduled meals to generate your dynamic checklist.")

# ==============================================================================
# MODULE: GYM FITNESS INTERFACE
# ==============================================================================
elif st.session_state["current_page"] == "Fitness Dashboard":
    if st.button("Back to Main Hub"): 
        st.session_state["editing_workout_id"] = None
        navigate_to("Main Hub")
        
    st.markdown("<h1 class='centered-title'>Fitness Command Center</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #8e8e9f;'>DeviceWorks Gym Logistics Hub — Command Center Interface Matrix</p>", unsafe_allow_html=True)
    
    strength_data = pd.read_sql_query("SELECT * FROM strength", conn)
    cardio_data = pd.read_sql_query("SELECT * FROM cardio", conn)
    
    total_lifts_logged = len(strength_data)
    total_cardio_logged = len(cardio_data)
    
    total_volume_kg = int((strength_data['weight'] * strength_data['sets'] * strength_data['reps']).sum()) if not strength_data.empty else 0
    total_cardio_mins = int(cardio_data['duration_mins'].sum()) if not cardio_data.empty else 0
    
    st.markdown("---")
    tile_col1, tile_col2, tile_col3 = st.columns(3)
    
    with tile_col1:
        st.metric(label="Cumulative Load Volume", value=f"{total_volume_kg:,} kg", delta="Active Engine")
    with tile_col2:
        st.metric(label="Cardio Output", value=f"{total_cardio_mins} mins", delta="Aerobic Runtime")
    with tile_col3:
        st.metric(label="System Throughput", value=total_lifts_logged + total_cardio_logged, delta="Verified Logs")
        
    st.markdown("---")
    control_left, control_right = st.columns(2)
    
    with control_left:
        st.markdown("<h3 class='centered-subtitle'>Active Management System</h3>", unsafe_allow_html=True)
        action_mode = st.selectbox(
            "Choose Operations Target:",
            ["Predefined Workout Template Builder", "Weekly Fitness Scheduler Matrix", "Log Manual Cardio Deck Session"]
        )
        
        # SUB-MODULE 1: TEMPLATE BUILDER
        if action_mode == "Predefined Workout Template Builder":
            st.markdown("<h5 class='centered-section'>Predefined Workout Template Builder</h5>", unsafe_allow_html=True)
            st.markdown("<p style='text-align: center; color: #8e8e9f;'>Design custom routine templates that can be executed and checked off the main hub.</p>", unsafe_allow_html=True)
            
            new_tmpl_name = st.text_input("Routine Template Name (e.g., Push Day, Leg Day A)")
            tmpl_exercises_text = st.text_area("Exercise Layout (Type one exercise name per line)")
            
            if st.button("Save Workout Template Routine", use_container_width=True):
                if new_tmpl_name and tmpl_exercises_text:
                    try:
                        cursor.execute("INSERT INTO workout_templates (name) VALUES (?)", (new_tmpl_name.strip(),))
                        for line in tmpl_exercises_text.split("\n"):
                            cleaned_exercise = line.strip().title()
                            if cleaned_exercise:
                                cursor.execute("INSERT INTO template_exercises (template_name, exercise_name) VALUES (?, ?)", (new_tmpl_name.strip(), cleaned_exercise))
                        conn.commit()
                        st.success(f"Successfully saved blueprint '{new_tmpl_name}' to system memory!")
                        st.rerun()
                    except sqlite3.IntegrityError:
                        st.error("A template routine with this exact designation already exists.")
                else: st.error("Please fill out all required layout fields.")
            
            st.markdown("---")
            st.markdown("<h5 class='centered-section'>Current Available Custom Blueprints</h5>", unsafe_allow_html=True)
            all_saved_tmpl = pd.read_sql_query("SELECT * FROM workout_templates", conn)
            if not all_saved_tmpl.empty:
                for _, t_row in all_saved_tmpl.iterrows():
                    with st.container(border=True):
                        disp_col1, disp_col2 = st.columns([3, 1])
                        with disp_col1:
                            st.markdown(f"**{t_row['name']}**")
                            ex_items_df = pd.read_sql_query("SELECT exercise_name FROM template_exercises WHERE template_name=?", conn, params=(t_row['name'],))
                            st.caption("Includes: " + ", ".join(ex_items_df["exercise_name"].tolist()))
                        with disp_col2:
                            if st.button("Delete Blueprint", key=f"del_tmpl_{t_row['id']}", use_container_width=True):
                                cursor.execute("DELETE FROM workout_templates WHERE id=?", (t_row['id'],))
                                cursor.execute("DELETE FROM template_exercises WHERE template_name=?", (t_row['name'],))
                                conn.commit()
                                st.warning("Blueprint removed.")
                                st.rerun()
            else: 
                st.markdown("<p style='text-align: center; color: #8e8e9f;'>No predefined routine structures configured yet.</p>", unsafe_allow_html=True)

        # SUB-MODULE 2: ROTATIONAL WEEKLY PLANNER
        elif action_mode == "Weekly Fitness Scheduler Matrix":
            st.markdown("<h5 class='centered-section'>Weekly Rotation Scheduler Matrix</h5>", unsafe_allow_html=True)
            st.markdown("<p style='text-align: center; color: #8e8e9f;'>Map custom workout routines to specific days of the week. These pop up live on the Main Hub.</p>", unsafe_allow_html=True)
            
            saved_templates_df = pd.read_sql_query("SELECT name FROM workout_templates", conn)
            available_templates = ["None", "Rest Day"] + saved_templates_df["name"].tolist()
            days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            weekly_selections = {}
            for d in days_of_week:
                existing_mapping = pd.read_sql_query("SELECT template_name FROM weekly_workout_plan WHERE day_of_week=?", conn, params=(d,))
                default_tmpl = existing_mapping.iloc[0]["template_name"] if not existing_mapping.empty else "None"
                if default_tmpl not in available_templates: default_tmpl = "None"
                
                weekly_selections[d] = st.selectbox(f"Set Routine for {d}:", available_templates, index=available_templates.index(default_tmpl), key=f"weekly_select_{d}")
            
            if st.button("Save Weekly Rotation Plan", use_container_width=True):
                for d, tmpl in weekly_selections.items():
                    cursor.execute("""
                    INSERT INTO weekly_workout_plan (day_of_week, template_name)
                    VALUES (?, ?)
                    ON CONFLICT(day_of_week)
                    DO UPDATE SET template_name=excluded.template_name
                    """, (d, tmpl))
                conn.commit()
                st.success("Weekly fitness layout updated successfully!")
                st.rerun()

        # SUB-MODULE 3: CARDIO ENGINE MANUAL ENTRY
        elif action_mode == "Log Manual Cardio Deck Session":
            date_val = st.date_input("Log Entry Date", date.today())
            activity = st.selectbox("Aerobic Mechanism:", ["Running", "Cycling", "Swimming", "Rowing Machine"])
            duration = st.slider("Session Duration (Minutes):", min_value=1.0, max_value=180.0, value=30.0)
            distance = st.number_input("Distance Traveled (KM)", min_value=0.0, step=0.1, value=5.0)
            
            if st.button("Broadcast Cardio Entry to Database", use_container_width=True):
                cursor.execute("INSERT INTO cardio (date, activity, duration_mins, distance_km) VALUES (?, ?, ?, ?)", (str(date_val), activity, duration, distance))
                conn.commit()
                st.success(f"Dispatched Entry: Recorded {activity} successfully!")
                st.rerun()

    with control_right:
        st.markdown("<h3 class='centered-subtitle'>Historical Verification Repositories</h3>", unsafe_allow_html=True)
        hist_choice = st.radio("Select Database Log to Inspect:", ["Logged Strength History Sets", "Logged Cardio Runs"], horizontal=True)
        
        if hist_choice == "Logged Strength History Sets" and not strength_data.empty:
            st.dataframe(strength_data[["id", "date", "exercise", "sets", "reps", "weight"]].sort_values("date", ascending=False), use_container_width=True, hide_index=True)
        elif hist_choice == "Logged Cardio Runs" and not cardio_data.empty:
            st.dataframe(cardio_data[["id", "date", "activity", "duration_mins", "distance_km"]].sort_values("date", ascending=False), use_container_width=True, hide_index=True)
        else:
            st.markdown("<p style='text-align: center; color: #8e8e9f;'>No historical records returned from storage database layer.</p>", unsafe_allow_html=True)
            
        st.markdown("---")
        st.markdown("<h5 class='centered-section'>Purge Past Workout Log Entry</h5>", unsafe_allow_html=True)
        st.markdown("<p style='text-align: center; color: #8e8e9f;'>Locate the structural row ID number in the verification table view to wipe out data permanently.</p>", unsafe_allow_html=True)
        
        target_purge_id = st.number_input("Enter Row ID to Delete", min_value=1, value=1, step=1, key="purge_id_input")
        
        if st.button("Delete Workout Log Permanent", use_container_width=True):
            if hist_choice == "Logged Strength History Sets":
                cursor.execute("DELETE FROM strength WHERE id = ?", (target_purge_id,))
            else:
                cursor.execute("DELETE FROM cardio WHERE id = ?", (target_purge_id,))
            conn.commit()
            st.success(f"Row entry ID {target_purge_id} cleared out successfully from databases.")
            st.rerun()