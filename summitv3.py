import os
import sqlite3
from datetime import date, timedelta, datetime
import pandas as pd
import tkinter as tk
from tkinter import ttk, messagebox

# Silence Tkinter System Deprecation Warnings on macOS/Unix environments
os.environ['TK_SILENCE_DEPRECATION'] = '1'

# ==============================================================================
# CUSTOM HIGH-TECH HUD THEME CONSTANTS
# ==============================================================================
BG_MAIN = "#060309"      # Deep void background
BG_CARD = "#120b1c"      # Dark violet card
TEXT_MAIN = "#ffffff"    # Crisp white text
TEXT_MUTED = "#7b7f9e"   # Muted cyber-grey
ACCENT_PINK = "#ff00a0"  # Neon pink/magenta
ACCENT_CYAN = "#00f0ff"  # Electric cyan
ACCENT_PURPLE = "#d946ef" # Vivid purple

# ==============================================================================
# DATABASE INITIALIZATION & MIGRATION
# ==============================================================================
def init_db():
    conn = sqlite3.connect("summit.db", check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    cursor.execute("CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, category TEXT, instructions TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS recipe_ingredients (id INTEGER PRIMARY KEY AUTOINCREMENT, recipe_name TEXT, ingredient_name TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS meal_plan (id INTEGER PRIMARY KEY AUTOINCREMENT, day_of_week TEXT, slot TEXT, recipe_name TEXT, UNIQUE(day_of_week, slot))")
    cursor.execute("CREATE TABLE IF NOT EXISTS strength (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, exercise TEXT, weight REAL, sets INTEGER, reps INTEGER)")
    cursor.execute("CREATE TABLE IF NOT EXISTS cardio (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, activity TEXT, duration_mins REAL, distance_km REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS workout_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)")
    cursor.execute("CREATE TABLE IF NOT EXISTS template_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, template_name TEXT, exercise_name TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS weekly_workout_plan (id INTEGER PRIMARY KEY AUTOINCREMENT, day_of_week TEXT UNIQUE, template_name TEXT)")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, due_date TEXT, target_date TEXT, est_hours REAL,
        actual_hours_spent REAL DEFAULT 0.0, is_completed INTEGER DEFAULT 0,
        work_days TEXT DEFAULT '', notes TEXT DEFAULT ''
    )""")
    
    # Run Migrations
    cursor.execute("PRAGMA table_info(tasks)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'notes' not in columns: cursor.execute("ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT ''")
    if 'work_days' not in columns: cursor.execute("ALTER TABLE tasks ADD COLUMN work_days TEXT DEFAULT ''")
    if 'actual_hours_spent' not in columns: cursor.execute("ALTER TABLE tasks ADD COLUMN actual_hours_spent REAL DEFAULT 0.0")
        
    cursor.execute("CREATE TABLE IF NOT EXISTS task_checklist (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, item_name TEXT, is_completed INTEGER DEFAULT 0)")
    
    conn.commit()
    return conn

conn = init_db()
cursor = conn.cursor()

# ==============================================================================
# HELPER LOGIC
# ==============================================================================
def format_to_swiss(date_str):
    if not date_str: return ""
    try:
        dt = datetime.strptime(date_str.split()[0], "%Y-%m-%d")
        return dt.strftime("%d.%m.%Y")
    except Exception: return date_str

def calculate_historical_velocity():
    cursor.execute("SELECT COUNT(*) FROM task_checklist WHERE is_completed = 1")
    completed = cursor.fetchone()[0] or 0
    cursor.execute("SELECT COUNT(*) FROM task_checklist")
    total = cursor.fetchone()[0] or 0
    return round(completed / total, 2) if total > 0 else 1.0

def get_distributed_task_milestones_for_date(target_date_obj):
    tasks_df = pd.read_sql_query("SELECT * FROM tasks WHERE is_completed = 0", conn)
    daily_allocations = []
    target_day_str = target_date_obj.strftime("%a") 
    today = date.today()
    
    for _, task in tasks_df.iterrows():
        try:
            task_target = datetime.strptime(task['target_date'], "%Y-%m-%d").date()
            work_days_str = str(task.get('work_days', ""))
            if work_days_str and target_day_str not in work_days_str: continue
            
            if today <= target_date_obj <= task_target:
                days_remaining = 0
                curr_date = today
                while curr_date <= task_target:
                    if not work_days_str or curr_date.strftime("%a") in work_days_str:
                        days_remaining += 1
                    curr_date += timedelta(days=1)
                    
                if days_remaining > 0:
                    cursor.execute("SELECT COUNT(*), SUM(is_completed) FROM task_checklist WHERE task_id = ?", (task['id'],))
                    res = cursor.fetchone()
                    total_milestones, completed_milestones = res[0] or 0, res[1] or 0
                    incomplete_milestones = total_milestones - completed_milestones
                    
                    if total_milestones == 0: incomplete_milestones = total_milestones = 1; completed_milestones = 0
                    
                    daily_allocations.append({
                        "task_id": task['id'], "task_name": task['name'],
                        "milestones_count": round(incomplete_milestones / days_remaining, 1),
                        "due_date": task['due_date'], "notes": str(task.get('notes', ''))
                    })
        except Exception: continue
    return daily_allocations

# ==============================================================================
# PORTABLE SCROLLABLE CANVAS CONTAINER CLASS FOR STANDARD TKINTER
# ==============================================================================
class ScrollableFrame(tk.Frame):
    def __init__(self, parent, *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.configure(bg=BG_MAIN)
        
        self.canvas = tk.Canvas(self, borderwidth=0, highlightthickness=0, bg=BG_MAIN)
        self.scrollbar = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = tk.Frame(self.canvas, bg=BG_MAIN)

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )

        self.canvas_window = self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.bind('<Configure>', lambda event: self.canvas.itemconfig(self.canvas_window, width=event.width))

        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")
        
        # Mouse Wheel Support
        self.bind_mouse_wheel(self.canvas)
        self.bind_mouse_wheel(self.scrollable_frame)

    def bind_mouse_wheel(self, widget):
        widget.bind("<MouseWheel>", self._on_mousewheel)
        widget.bind("<Button-4>", self._on_mousewheel)
        widget.bind("<Button-5>", self._on_mousewheel)

    def _on_mousewheel(self, event):
        if event.num == 5 or event.delta < 0:
            self.canvas.yview_scroll(1, "units")
        elif event.num == 4 or event.delta > 0:
            self.canvas.yview_scroll(-1, "units")

# ==============================================================================
# MAIN APPLICATION WINDOW MANAGEMENT
# ==============================================================================
class SummitApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Summit Command Center")
        self.geometry("1400x900")
        self.configure(bg=BG_MAIN)
        
        # High-Contrast Dark Custom Styling
        style = ttk.Style()
        style.theme_use("default")
        style.configure("TScrollbar", background=BG_CARD, bordercolor=BG_MAIN, arrowcolor=ACCENT_CYAN, troughcolor=BG_MAIN)
        style.configure("Treeview", background=BG_CARD, foreground=TEXT_MAIN, fieldbackground=BG_CARD, borderwidth=0, rowheight=30, font=("Arial", 10))
        style.configure("Treeview.Heading", background=BG_MAIN, foreground=ACCENT_PINK, font=("Arial", 10, "bold"), borderwidth=0)
        style.map('Treeview', background=[('selected', ACCENT_PURPLE)], foreground=[('selected', TEXT_MAIN)])
        
        # Top Cybernetic Header Frame
        self.nav_frame = tk.Frame(self, bg=BG_CARD, height=75, bd=1, relief="flat", highlightbackground=ACCENT_PURPLE, highlightthickness=1)
        self.nav_frame.pack(fill="x", side="top")
        
        title_lbl = tk.Label(self.nav_frame, text="SUMMIT COMMAND MATRIX", font=("Arial", 20, "bold"), bg=BG_CARD, fg=ACCENT_PINK)
        title_lbl.pack(side="left", padx=30, pady=15)
        
        # Styled Custom Navigation Buttons
        self.btn_hub = self.create_nav_btn("MAIN HUB", lambda: self.show_frame("MainHub"))
        self.btn_tasks = self.create_nav_btn("TASK DISTRIBUTOR", lambda: self.show_frame("TaskDashboard"))
        self.btn_recipe = self.create_nav_btn("NUTRITION", lambda: self.show_frame("RecipeDashboard"))
        self.btn_fitness = self.create_nav_btn("FITNESS", lambda: self.show_frame("FitnessDashboard"))
        
        # Screen Swap container setup
        self.container = tk.Frame(self, bg=BG_MAIN)
        self.container.pack(fill="both", expand=True)
        
        self.frames = {}
        for F in (MainHub, TaskDashboard, RecipeDashboard, FitnessDashboard):
            page_name = F.__name__
            frame = F(parent=self.container, controller=self)
            self.frames[page_name] = frame
            
        self.current_frame = None
        self.show_frame("MainHub")

    def create_nav_btn(self, text, command):
        btn = tk.Button(self.nav_frame, text=text, bg=BG_MAIN, fg=ACCENT_CYAN, activebackground=ACCENT_PURPLE, activeforeground=TEXT_MAIN,
                        font=("Arial", 10, "bold"), bd=1, relief="solid", highlightcolor=ACCENT_CYAN, cursor="hand2", padx=15, pady=8, command=command)
        btn.pack(side="left", padx=10)
        
        # Smooth Hover Effects
        def on_enter(e): btn.config(bg=ACCENT_CYAN, fg=BG_MAIN)
        def on_leave(e): btn.config(bg=BG_MAIN, fg=ACCENT_CYAN)
        btn.bind("<Enter>", on_enter)
        btn.bind("<Leave>", on_leave)
        return btn

    def show_frame(self, page_name):
        if self.current_frame:
            self.current_frame.pack_forget()
        self.current_frame = self.frames[page_name]
        self.current_frame.pack(fill="both", expand=True)
        self.current_frame.refresh()
        
    def show_toast(self, message):
        toast = tk.Label(self, text=message, bg=ACCENT_PINK, fg=BG_MAIN, font=("Arial", 12, "bold"), padx=25, pady=10, relief="solid", bd=1)
        toast.place(relx=0.5, rely=0.9, anchor="center")
        self.after(2500, toast.destroy)

# ==============================================================================
# SCREEN: MAIN HUB
# ==============================================================================
class MainHub(ScrollableFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller
        
    def refresh(self):
        # Clear previous elements inside the inner scrollable canvas frame
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
            
        self.scrollable_frame.grid_columnconfigure(0, weight=6)
        self.scrollable_frame.grid_columnconfigure(1, weight=4)
        
        today_date = date.today()
        today_day = today_date.strftime("%A")
        
        left_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        left_panel.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        
        right_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        right_panel.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        
        # --- LEFT PANEL: TODAY'S BLUEPRINT ---
        title = tk.Label(left_panel, text="TODAY'S OPERATIONAL MATRIX", font=("Arial", 22, "bold"), bg=BG_MAIN, fg=ACCENT_PINK)
        title.pack(anchor="center", pady=(10, 5))
        
        subtitle = tk.Label(left_panel, text=f"TIMELINE REF: {today_day.upper()} | STAMP: {today_date.strftime('%d.%m.%Y')}", font=("Arial", 11, "bold"), bg=BG_MAIN, fg=TEXT_MUTED)
        subtitle.pack(anchor="center", pady=(0, 20))
        
        # Meals Card Container
        meal_card = tk.Frame(left_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_PURPLE, highlightthickness=1)
        meal_card.pack(fill="x", pady=10, ipady=10)
        tk.Label(meal_card, text="FUEL DEPLOYED TO DATE", font=("Arial", 12, "bold"), bg=BG_CARD, fg=ACCENT_PURPLE).pack(anchor="center", pady=(10, 10))
        
        meal_query = pd.read_sql_query("SELECT slot, recipe_name FROM meal_plan WHERE day_of_week=? AND recipe_name != 'None'", conn, params=(today_day,))
        if not meal_query.empty:
            for _, row in meal_query.iterrows():
                prefix = "[Special Option]" if row['recipe_name'] == "Flight" else "->"
                tk.Label(meal_card, text=f"{prefix} {row['slot']}: {row['recipe_name']}", font=("Arial", 11), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="center", pady=2)
        else:
            tk.Label(meal_card, text="No nutrition maps set for today.", font=("Arial", 11, "italic"), bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="center", pady=2)
            
        # Fitness Card Container
        fit_card = tk.Frame(left_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_CYAN, highlightthickness=1)
        fit_card.pack(fill="x", pady=10, ipady=10)
        tk.Label(fit_card, text="PHYSICAL WORKOUT ACTIVE", font=("Arial", 12, "bold"), bg=BG_CARD, fg=ACCENT_CYAN).pack(anchor="center", pady=(10, 10))
        
        fit_query = pd.read_sql_query("SELECT template_name FROM weekly_workout_plan WHERE day_of_week=?", conn, params=(today_day,))
        if not fit_query.empty and fit_query.iloc[0]['template_name'] not in ['None', 'Rest Day']:
            template_name = fit_query.iloc[0]['template_name']
            tk.Label(fit_card, text=f"Blueprint: {template_name}", font=("Arial", 11, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="center", pady=2)
            ex_df = pd.read_sql_query("SELECT exercise_name FROM template_exercises WHERE template_name=?", conn, params=(template_name,))
            if not ex_df.empty:
                for _, ex_row in ex_df.iterrows():
                    tk.Label(fit_card, text=f"- {ex_row['exercise_name']}", font=("Arial", 10), bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="center", pady=1)
        else:
            tk.Label(fit_card, text="No formal physical routines assigned.", font=("Arial", 11, "italic"), bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="center", pady=2)

        # Milestone Target Tasks Card
        task_label = tk.Label(left_panel, text="MILESTONE TARGET CHUNKS (TODAY)", font=("Arial", 14, "bold"), bg=BG_MAIN, fg=ACCENT_PINK)
        task_label.pack(anchor="center", pady=(20, 10))
        
        today_chunks = get_distributed_task_milestones_for_date(today_date)
        if today_chunks:
            for chunk in today_chunks:
                chunk_box = tk.Frame(left_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_PURPLE, highlightthickness=1)
                chunk_box.pack(fill="x", pady=5, ipady=5)
                
                swiss_due = format_to_swiss(chunk['due_date'])
                tk.Label(chunk_box, text=f"[TASK] {chunk['task_name']} — Target: {chunk['milestones_count']} Milestones (Due: {swiss_due})", font=("Arial", 12, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(5,5))
                
                if chunk['notes']:
                    tk.Label(chunk_box, text=f"Notes: {chunk['notes']}", font=("Arial", 10), bg=BG_CARD, fg=ACCENT_CYAN, wraplength=500, justify="left").pack(anchor="w", padx=15, pady=5)
                
                checklist_df = pd.read_sql_query("SELECT * FROM task_checklist WHERE task_id=?", conn, params=(chunk['task_id'],))
                if not checklist_df.empty:
                    for _, item in checklist_df.iterrows():
                        chk_var = tk.IntVar(value=item['is_completed'])
                        
                        def update_cmd(item_id=item['id'], var_ref=chk_var):
                            cursor.execute("UPDATE task_checklist SET is_completed=? WHERE id=?", (var_ref.get(), item_id))
                            conn.commit()
                            self.refresh()
                            
                        chk = tk.Checkbutton(chunk_box, text=item['item_name'], variable=chk_var, onvalue=1, offvalue=0, command=update_cmd,
                                             bg=BG_CARD, fg=TEXT_MAIN, activebackground=BG_CARD, activeforeground=ACCENT_PINK, selectcolor=BG_MAIN, font=("Arial", 10))
                        chk.pack(anchor="w", padx=30, pady=3)
                else:
                    tk.Label(chunk_box, text="No custom milestone metrics logged.", font=("Arial", 10, "italic"), bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="w", padx=30, pady=4)
        else:
            tk.Label(left_panel, text="Zero milestone allocations queued for this timeline branch.", font=("Arial", 11, "italic"), bg=BG_MAIN, fg=TEXT_MUTED).pack(anchor="center", pady=10)

        # --- RIGHT PANEL: UPCOMING SCHEDULE ---
        tk.Label(right_panel, text="UPCOMING SCHEDULE", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_PURPLE).pack(anchor="center", pady=(10, 20))
        for i in range(1, 4):
            future_date = date.today() + timedelta(days=i)
            future_day = future_date.strftime("%A")
            
            day_card = tk.Frame(right_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=TEXT_MUTED, highlightthickness=1)
            day_card.pack(fill="x", pady=10, ipady=10)
            
            tk.Label(day_card, text=f"{future_day.upper()} ({future_date.strftime('%d.%m')})", font=("Arial", 12, "bold"), bg=BG_CARD, fg=ACCENT_PINK).pack(anchor="center", pady=5)
            
            f_meal = pd.read_sql_query("SELECT recipe_name FROM meal_plan WHERE day_of_week=? AND recipe_name != 'None'", conn, params=(future_day,))
            m_txt = "Food: " + ", ".join(f_meal['recipe_name'].tolist()) if not f_meal.empty else "Food: System Idle"
            tk.Label(day_card, text=m_txt, font=("Arial", 11), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="center", pady=2)
            
            f_fit = pd.read_sql_query("SELECT template_name FROM weekly_workout_plan WHERE day_of_week=?", conn, params=(future_day,))
            fit_txt = f"Fit: {f_fit.iloc[0]['template_name']}" if not f_fit.empty else "Fit: Rest Day"
            tk.Label(day_card, text=fit_txt, font=("Arial", 11), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="center", pady=2)
            
            f_chunks = get_distributed_task_milestones_for_date(future_date)
            total_milestones = sum(c['milestones_count'] for c in f_chunks)
            tk.Label(day_card, text=f"Tasks: {total_milestones} milestones scheduled", font=("Arial", 11), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="center", pady=(2, 10))

# ==============================================================================
# SCREEN: SMART TASK DISTRIBUTOR
# ==============================================================================
class TaskDashboard(ScrollableFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

    def refresh(self):
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
            
        self.scrollable_frame.grid_columnconfigure(0, weight=1)
        self.scrollable_frame.grid_columnconfigure(1, weight=1)
        
        # --- HEADER SECTOR ---
        header_lbl = tk.Label(self.scrollable_frame, text="TASK DISTRIBUTOR // PREDICTIVE MILESTONE ENGINE", font=("Arial", 20, "bold"), bg=BG_MAIN, fg=ACCENT_PINK)
        header_lbl.grid(row=0, column=0, columnspan=2, pady=20, sticky="center")
        
        # Analytics Top Metrics Widgets
        v_mod = calculate_historical_velocity()
        today_chunks = get_distributed_task_milestones_for_date(date.today())
        total_load = sum(c['milestones_count'] for c in today_chunks)
        pending_count = pd.read_sql_query("SELECT COUNT(*) as count FROM tasks WHERE is_completed = 0", conn).iloc[0]['count']
        
        metrics_frame = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        metrics_frame.grid(row=1, column=0, columnspan=2, pady=10, sticky="ew")
        metrics_frame.grid_columnconfigure((0,1,2), weight=1)
        
        def render_metric(col, label, value, note):
            m_box = tk.Frame(metrics_frame, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_CYAN, highlightthickness=1)
            m_box.grid(row=0, column=col, sticky="nsew", padx=15, ipady=5)
            tk.Label(m_box, text=label, font=("Arial", 9, "bold"), bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="center", pady=(10, 2))
            tk.Label(m_box, text=value, font=("Arial", 24, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="center")
            tk.Label(m_box, text=note, font=("Arial", 9, "bold"), bg=BG_CARD, fg=ACCENT_PINK).pack(anchor="center", pady=(2, 10))
            
        render_metric(0, "HISTORICAL VELOCITY", f"{int(v_mod * 100)}%", "Engine Running Optimal" if v_mod >= 0.8 else "Backlog Burn Rate Warning")
        render_metric(1, "MILESTONES DUE TODAY", f"{total_load}", "Allocated Tasks")
        render_metric(2, "BACKLOG VECTOR HORIZON", f"{pending_count}", "Active Projects")
        
        # Split Workspace layout panels
        left_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        left_panel.grid(row=2, column=0, sticky="nsew", padx=20, pady=20)
        
        right_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        right_panel.grid(row=2, column=1, sticky="nsew", padx=20, pady=20)
        
        # --- LEFT PANEL: INITIALIZE PROJECT FORM ---
        tk.Label(left_panel, text="CREATE NEW PROJECT", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_CYAN).pack(anchor="center", pady=(0, 15))
        
        form_card = tk.Frame(left_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_CYAN, highlightthickness=1)
        form_card.pack(fill="x", ipady=15)
        
        tk.Label(form_card, text="Operational Task Designation Name", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(15, 0))
        name_entry = tk.Entry(form_card, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 11), width=45)
        name_entry.pack(anchor="w", padx=15, pady=5)
        
        # Form Dates Row Layout Frame
        date_frame = tk.Frame(form_card, bg="transparent")
        date_frame.pack(fill="x", padx=15, pady=10)
        
        tk.Label(date_frame, text="Hard Milestone Deadline (YYYY-MM-DD)", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).grid(row=0, column=0, sticky="w")
        due_entry = tk.Entry(date_frame, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 11), width=20)
        due_entry.insert(0, date.today().strftime("%Y-%m-%d"))
        due_entry.grid(row=1, column=0, padx=(0, 15), pady=5)
        
        tk.Label(date_frame, text="Soft Buffer Target Wrap (YYYY-MM-DD)", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).grid(row=0, column=1, sticky="w")
        target_entry = tk.Entry(date_frame, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 11), width=20)
        target_entry.insert(0, date.today().strftime("%Y-%m-%d"))
        target_entry.grid(row=1, column=1, pady=5)
        
        # Active Workdays Selector Matrix
        tk.Label(form_card, text="Select Work Days", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10, 0))
        days_frame = tk.Frame(form_card, bg="transparent")
        days_frame.pack(fill="x", padx=15, pady=5)
        
        day_vars = {}
        for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
            var = tk.StringVar(value="")
            chk = tk.Checkbutton(days_frame, text=d, variable=var, onvalue=d, offvalue="", bg=BG_CARD, fg=TEXT_MAIN,
                                 activebackground=BG_CARD, activeforeground=ACCENT_CYAN, selectcolor=BG_MAIN, font=("Arial", 9, "bold"))
            chk.pack(side="left", padx=3)
            day_vars[d] = var
            
        # Notes Description Text Block Widget
        tk.Label(form_card, text="Vector Target Specifications / Details", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10, 0))
        notes_text = tk.Text(form_card, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 10), height=3, width=45)
        notes_text.pack(anchor="w", padx=15, pady=5)
        
        # Dynamic Bullet Task Ingestion field
        tk.Label(form_card, text="Inject checklist milestones (One directive per line)", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10, 0))
        check_text = tk.Text(form_card, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 10), height=4, width=45)
        check_text.pack(anchor="w", padx=15, pady=5)
        
        def commit_task():
            proj_name = name_entry.get()
            due_d = due_entry.get()
            targ_d = target_entry.get()
            work_days_list = [v.get() for v in day_vars.values() if v.get()]
            work_days_str = ",".join(work_days_list)
            notes_str = notes_text.get("1.0", "end-1c")
            checks_lines = check_text.get("1.0", "end-1c").split("\n")
            
            if proj_name:
                cursor.execute("INSERT INTO tasks (name, due_date, target_date, est_hours, work_days, notes) VALUES (?, ?, ?, ?, ?, ?)",
                               (proj_name, due_d, targ_d, 1.0, work_days_str, notes_str))
                task_id = cursor.lastrowid
                
                for line in checks_lines:
                    if line.strip():
                        cursor.execute("INSERT INTO task_checklist (task_id, item_name) VALUES (?, ?)", (task_id, line.strip()))
                conn.commit()
                self.controller.show_toast(f"Vector '{proj_name}' compiled!")
                self.refresh()
            else:
                messagebox.showwarning("Validation Fail", "Please enter a valid task name designation.")
                
        btn_submit = tk.Button(form_card, text="ADD TO QUEUE", bg=BG_MAIN, fg=ACCENT_PINK, activebackground=ACCENT_PINK, activeforeground=BG_MAIN,
                               font=("Arial", 10, "bold"), bd=1, relief="solid", cursor="hand2", padx=10, pady=10, command=commit_task)
        btn_submit.pack(fill="x", padx=15, pady=20)
        
        # Hover properties
        btn_submit.bind("<Enter>", lambda e: btn_submit.config(bg=ACCENT_PINK, fg=BG_MAIN))
        btn_submit.bind("<Leave>", lambda e: btn_submit.config(bg=BG_MAIN, fg=ACCENT_PINK))

        # --- RIGHT PANEL: ACTIVE BACKLOG TASKS CHUNKS ---
        tk.Label(right_panel, text="SYSTEM BACKLOG AND ACTIVE RUNTIMES", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_PURPLE).pack(anchor="center", pady=(0, 15))
        
        tasks_df = pd.read_sql_query("SELECT * FROM tasks WHERE is_completed = 0", conn)
        if not tasks_df.empty:
            for _, row in tasks_df.iterrows():
                t_card = tk.Frame(right_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_CYAN, highlightthickness=1)
                t_card.pack(fill="x", pady=10, ipady=10)
                
                swiss_target = format_to_swiss(row['target_date'])
                checklist = pd.read_sql_query("SELECT * FROM task_checklist WHERE task_id=?", conn, params=(row['id'],))
                t_count = len(checklist)
                c_count = len(checklist[checklist['is_completed'] == 1]) if t_count > 0 else 0
                prog_pct = c_count / t_count if t_count > 0 else 0.0
                
                tk.Label(t_card, text=f"■ {row['name'].upper()} ({c_count}/{t_count} Done) — Target: {swiss_target}", font=("Arial", 12, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10, 0))
                
                # Visual Simulated Progress Meter
                prog_frame = tk.Frame(t_card, bg=BG_MAIN, height=6)
                prog_frame.pack(fill="x", padx=15, pady=10)
                prog_fill = tk.Frame(prog_frame, bg=ACCENT_PINK, height=6)
                prog_fill.place(relx=0, rely=0, relwidth=prog_pct)
                
                if not checklist.empty:
                    for _, c_row in checklist.iterrows():
                        chk_var = tk.IntVar(value=c_row['is_completed'])
                        
                        def update_checklist_item(item_id=c_row['id'], var_ref=chk_var):
                            cursor.execute("UPDATE task_checklist SET is_completed=? WHERE id=?", (var_ref.get(), item_id))
                            conn.commit()
                            self.refresh()
                            
                        chk = tk.Checkbutton(t_card, text=c_row['item_name'], variable=chk_var, onvalue=1, offvalue=0, command=update_checklist_item,
                                             bg=BG_CARD, fg=TEXT_MAIN, activebackground=BG_CARD, activeforeground=ACCENT_PURPLE, selectcolor=BG_MAIN, font=("Arial", 10))
                        chk.pack(anchor="w", padx=30, pady=2)
                else:
                    tk.Label(t_card, text="No process directives recorded.", font=("Arial", 10, "italic"), bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="w", padx=30, pady=2)
                    
                btn_frame = tk.Frame(t_card, bg="transparent")
                btn_frame.pack(fill="x", padx=15, pady=15)
                
                # Complete/Archive task
                def make_archive_cmd(tid=row['id']):
                    return lambda: self.complete_task(tid)
                btn_arch = tk.Button(btn_frame, text="ARCHIVE SYSTEM LOGS", bg=BG_MAIN, fg=ACCENT_CYAN, font=("Arial", 9, "bold"), bd=1, relief="solid", cursor="hand2", padx=5, pady=5, command=make_archive_cmd())
                btn_arch.pack(side="left", expand=True, fill="x", padx=5)
                
                # Purge task
                def make_delete_cmd(tid=row['id']):
                    return lambda: self.delete_task(tid)
                btn_purge = tk.Button(btn_frame, text="PURGE TASK VECTOR", bg=BG_MAIN, fg=ACCENT_PINK, font=("Arial", 9, "bold"), bd=1, relief="solid", cursor="hand2", padx=5, pady=5, command=make_delete_cmd())
                btn_purge.pack(side="left", expand=True, fill="x", padx=5)
                
                # Hover bindings
                btn_arch.bind("<Enter>", lambda e, b=btn_arch: b.config(bg=ACCENT_CYAN, fg=BG_MAIN))
                btn_arch.bind("<Leave>", lambda e, b=btn_arch: b.config(bg=BG_MAIN, fg=ACCENT_CYAN))
                btn_purge.bind("<Enter>", lambda e, b=btn_purge: b.config(bg=ACCENT_PINK, fg=BG_MAIN))
                btn_purge.bind("<Leave>", lambda e, b=btn_purge: b.config(bg=BG_MAIN, fg=ACCENT_PINK))
        else:
            tk.Label(right_panel, text="System operational backlog is empty.", font=("Arial", 11, "italic"), bg=BG_MAIN, fg=TEXT_MUTED).pack(anchor="center")

        # --- BOTTOM WORKLOAD HORIZON DATA GRID ---
        bottom_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        bottom_panel.grid(row=3, column=0, columnspan=2, sticky="ew", padx=20, pady=20)
        
        tk.Label(bottom_panel, text="WORKLOAD HORIZON (14-DAY FORECAST)", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_CYAN).pack(anchor="center", pady=(0, 10))
        
        columns = ("Day", "Date", "Milestones Due")
        tree = ttk.Treeview(bottom_panel, columns=columns, show="headings", height=7)
        for col in columns:
            tree.heading(col, text=col)
            tree.column(col, anchor="center")
        tree.pack(fill="x", expand=True)
        
        for i in range(14):
            target_d = date.today() + timedelta(days=i)
            chunks = get_distributed_task_milestones_for_date(target_d)
            total = sum(c['milestones_count'] for c in chunks)
            tree.insert("", "end", values=(target_d.strftime("%a"), target_d.strftime("%d.%m.%Y"), total))

    def complete_task(self, t_id):
        cursor.execute("UPDATE tasks SET is_completed=1 WHERE id=?", (t_id,))
        cursor.execute("UPDATE task_checklist SET is_completed=1 WHERE task_id=?", (t_id,))
        conn.commit()
        self.controller.show_toast("Profile Archived!")
        self.refresh()
        
    def delete_task(self, t_id):
        cursor.execute("DELETE FROM tasks WHERE id=?", (t_id,))
        cursor.execute("DELETE FROM task_checklist WHERE task_id=?", (t_id,))
        conn.commit()
        self.controller.show_toast("Task Deleted!")
        self.refresh()

# ==============================================================================
# SCREEN: NUTRITION DASHBOARD
# ==============================================================================
class RecipeDashboard(ScrollableFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

    def refresh(self):
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
            
        self.scrollable_frame.grid_columnconfigure(0, weight=1)
        self.scrollable_frame.grid_columnconfigure(1, weight=1)
        
        left_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        left_panel.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        
        right_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        right_panel.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        
        # --- LEFT: BLUEPRINT INGESTION FORM ---
        tk.Label(left_panel, text="NUTRITION PLANNER // BLUEPRINT INGESTION", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_PINK).pack(anchor="center", pady=(0, 20))
        
        form = tk.Frame(left_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_CYAN, highlightthickness=1)
        form.pack(fill="x", ipady=15)
        
        tk.Label(form, text="Ingestion Designation Target ID (Recipe Name)", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(15, 0))
        r_name = tk.Entry(form, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 11), width=40)
        r_name.pack(anchor="w", padx=15, pady=5)
        
        tk.Label(form, text="Resource Classification Vector", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10, 0))
        r_cat_var = tk.StringVar(value="Meal")
        r_cat = ttk.Combobox(form, textvariable=r_cat_var, values=["Breakfast", "Meal", "Snacks", "Desserts"], width=38, state="readonly")
        r_cat.pack(anchor="w", padx=15, pady=5)
        
        tk.Label(form, text="Critical Component Inventory (One per line)", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10, 0))
        r_ing = tk.Text(form, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 10), height=5, width=40)
        r_ing.pack(anchor="w", padx=15, pady=5)
        
        tk.Label(form, text="Synthesizing Protocols (Cooking Steps)", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10, 0))
        r_inst = tk.Text(form, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 10), height=5, width=40)
        r_inst.pack(anchor="w", padx=15, pady=5)
        
        def save_recipe():
            name = r_name.get()
            if name:
                try:
                    cursor.execute("INSERT INTO recipes (name, category, instructions) VALUES (?, ?, ?)", (name, r_cat_var.get(), r_inst.get("1.0", "end-1c")))
                    for line in r_ing.get("1.0", "end-1c").split("\n"):
                        if line.strip(): cursor.execute("INSERT INTO recipe_ingredients (recipe_name, ingredient_name) VALUES (?, ?)", (name, line.strip().title()))
                    conn.commit()
                    self.controller.show_toast("Blueprint Saved!")
                    self.refresh()
                except sqlite3.IntegrityError:
                    messagebox.showerror("Operation Collision", "The ingestion profile already exists inside standard databases.")
            else:
                messagebox.showwarning("Validation Warning", "Please enter a valid recipe designator.")
                    
        btn_save = tk.Button(form, text="ENCODE RECIPE BLUEPRINT", bg=BG_MAIN, fg=ACCENT_CYAN, activebackground=ACCENT_CYAN, activeforeground=BG_MAIN,
                             font=("Arial", 10, "bold"), bd=1, relief="solid", cursor="hand2", padx=10, pady=10, command=save_recipe)
        btn_save.pack(fill="x", padx=15, pady=20)
        btn_save.bind("<Enter>", lambda e: btn_save.config(bg=ACCENT_CYAN, fg=BG_MAIN))
        btn_save.bind("<Leave>", lambda e: btn_save.config(bg=BG_MAIN, fg=ACCENT_CYAN))

        # --- RIGHT: WEEKLY RESOURCE MATRIX ---
        tk.Label(right_panel, text="CHRONOLOGICAL DEPLOYMENT MAPPING", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_PURPLE).pack(anchor="center", pady=(0, 20))
        
        plan_card = tk.Frame(right_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_PURPLE, highlightthickness=1)
        plan_card.pack(fill="x", ipady=10)
        
        recipes_df = pd.read_sql_query("SELECT name FROM recipes", conn)
        opts = ["None", "Flight"] + recipes_df["name"].tolist()
        
        # Tabs notebook system
        notebook = ttk.Notebook(plan_card)
        notebook.pack(fill="both", expand=True, padx=15, pady=10)
        
        slots = ["Breakfast", "Meal 1", "Meal 2", "Snack 1", "Snack 2"]
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        db_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        combos = {}
        for i, d in enumerate(days):
            db_d = db_days[i]
            tab = tk.Frame(notebook, bg=BG_MAIN)
            notebook.add(tab, text=d)
            
            for slot in slots:
                tk.Label(tab, text=f"Assign {slot}:", font=("Arial", 9, "bold"), bg=BG_MAIN, fg=ACCENT_CYAN).pack(anchor="w", padx=15, pady=(5,0))
                
                existing = pd.read_sql_query("SELECT recipe_name FROM meal_plan WHERE day_of_week=? AND slot=?", conn, params=(db_d, slot))
                def_val = existing.iloc[0]["recipe_name"] if not existing.empty else "None"
                if def_val not in opts: def_val = "None"
                
                cb_var = tk.StringVar(value=def_val)
                cb = ttk.Combobox(tab, textvariable=cb_var, values=opts, width=28, state="readonly")
                cb.pack(anchor="w", padx=15, pady=(2,5))
                combos[(db_d, slot)] = cb_var
                
        def save_plan():
            for (day, slot), var_ref in combos.items():
                cursor.execute("INSERT INTO meal_plan (day_of_week, slot, recipe_name) VALUES (?, ?, ?) ON CONFLICT(day_of_week, slot) DO UPDATE SET recipe_name=excluded.recipe_name", (day, slot, var_ref.get()))
            conn.commit()
            self.controller.show_toast("Rotational scheduler updated!")
            self.refresh()
            
        btn_lock = tk.Button(plan_card, text="LOCK WEEKLY MATRIX", bg=BG_MAIN, fg=ACCENT_PINK, activebackground=ACCENT_PINK, activeforeground=BG_MAIN,
                             font=("Arial", 10, "bold"), bd=1, relief="solid", cursor="hand2", padx=10, pady=10, command=save_plan)
        btn_lock.pack(fill="x", padx=15, pady=15)
        btn_lock.bind("<Enter>", lambda e: btn_lock.config(bg=ACCENT_PINK, fg=BG_MAIN))
        btn_lock.bind("<Leave>", lambda e: btn_lock.config(bg=BG_MAIN, fg=ACCENT_PINK))

# ==============================================================================
# SCREEN: FITNESS DASHBOARD
# ==============================================================================
class FitnessDashboard(ScrollableFrame):
    def __init__(self, parent, controller):
        super().__init__(parent)
        self.controller = controller

    def refresh(self):
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
            
        self.scrollable_frame.grid_columnconfigure(0, weight=1)
        self.scrollable_frame.grid_columnconfigure(1, weight=1)
        
        left_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        left_panel.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        
        right_panel = tk.Frame(self.scrollable_frame, bg=BG_MAIN)
        right_panel.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        
        # --- LEFT: TEMPLATE BUILDER & ROTATION ---
        tk.Label(left_panel, text="FITNESS SYSTEM MATRIX BUILDER", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_CYAN).pack(anchor="center", pady=(0, 20))
        
        tmpl_card = tk.Frame(left_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_CYAN, highlightthickness=1)
        tmpl_card.pack(fill="x", pady=(0, 20), ipady=15)
        
        tk.Label(tmpl_card, text="Routine Designation ID", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(15,0))
        t_name = tk.Entry(tmpl_card, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 11), width=40)
        t_name.pack(anchor="w", padx=15, pady=5)
        
        tk.Label(tmpl_card, text="Exercise Array Matrix (One per line)", font=("Arial", 10, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", padx=15, pady=(10,0))
        t_exs = tk.Text(tmpl_card, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 10), height=5, width=40)
        t_exs.pack(anchor="w", padx=15, pady=5)
        
        def save_tmpl():
            name = t_name.get()
            if name:
                try:
                    cursor.execute("INSERT INTO workout_templates (name) VALUES (?)", (name,))
                    for line in t_exs.get("1.0", "end-1c").split("\n"):
                        if line.strip(): cursor.execute("INSERT INTO template_exercises (template_name, exercise_name) VALUES (?, ?)", (name, line.strip().title()))
                    conn.commit()
                    self.controller.show_toast("Blueprint Encoded!")
                    self.refresh()
                except sqlite3.IntegrityError:
                    messagebox.showerror("Error", "Workout template Designation vector already active.")
            else:
                messagebox.showwarning("Validation Warning", "Please enter a valid workout routine designation name.")
                
        btn_save = tk.Button(tmpl_card, text="ENCODE PHYSICAL BLUEPRINT", bg=BG_MAIN, fg=ACCENT_PURPLE, activebackground=ACCENT_PURPLE, activeforeground=BG_MAIN,
                             font=("Arial", 10, "bold"), bd=1, relief="solid", cursor="hand2", padx=10, pady=10, command=save_tmpl)
        btn_save.pack(fill="x", padx=15, pady=20)
        btn_save.bind("<Enter>", lambda e: btn_save.config(bg=ACCENT_PURPLE, fg=BG_MAIN))
        btn_save.bind("<Leave>", lambda e: btn_save.config(bg=BG_MAIN, fg=ACCENT_PURPLE))

        # Chrono-rotational scheduler
        sched_card = tk.Frame(left_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_PINK, highlightthickness=1)
        sched_card.pack(fill="x", ipady=15)
        tk.Label(sched_card, text="CHRONO-ROTATIONAL SCHEDULER", font=("Arial", 12, "bold"), bg=BG_CARD, fg=ACCENT_PINK).pack(anchor="center", pady=10)
        
        opts = ["None", "Rest Day"] + pd.read_sql_query("SELECT name FROM workout_templates", conn)["name"].tolist()
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        w_combos = {}
        for d in days:
            f = tk.Frame(sched_card, bg="transparent")
            f.pack(fill="x", padx=15, pady=4)
            tk.Label(f, text=d, width=12, anchor="w", bg=BG_CARD, fg=TEXT_MAIN, font=("Arial", 10, "bold")).pack(side="left")
            
            existing = pd.read_sql_query("SELECT template_name FROM weekly_workout_plan WHERE day_of_week=?", conn, params=(d,))
            def_val = existing.iloc[0]["template_name"] if not existing.empty else "None"
            if def_val not in opts: def_val = "None"
            
            cb_var = tk.StringVar(value=def_val)
            cb = ttk.Combobox(f, textvariable=cb_var, values=opts, width=22, state="readonly")
            cb.pack(side="right")
            w_combos[d] = cb_var
            
        def save_sched():
            for d, var_ref in w_combos.items():
                cursor.execute("INSERT INTO weekly_workout_plan (day_of_week, template_name) VALUES (?, ?) ON CONFLICT(day_of_week) DO UPDATE SET template_name=excluded.template_name", (d, var_ref.get()))
            conn.commit()
            self.controller.show_toast("Rotational Directives Locked!")
            self.refresh()
            
        btn_lock = tk.Button(sched_card, text="ENCODE ROTATIONAL DIRECTIVES", bg=BG_MAIN, fg=ACCENT_CYAN, activebackground=ACCENT_CYAN, activeforeground=BG_MAIN,
                             font=("Arial", 10, "bold"), bd=1, relief="solid", cursor="hand2", padx=10, pady=10, command=save_sched)
        btn_lock.pack(fill="x", padx=15, pady=15)
        btn_lock.bind("<Enter>", lambda e: btn_lock.config(bg=ACCENT_CYAN, fg=BG_MAIN))
        btn_lock.bind("<Leave>", lambda e: btn_lock.config(bg=BG_MAIN, fg=ACCENT_CYAN))

        # --- RIGHT: CHRONOLOGICAL DATAGRID LOGGER ---
        tk.Label(right_panel, text="CHRONOLOGICAL TRACKER DATABASES", font=("Arial", 16, "bold"), bg=BG_MAIN, fg=ACCENT_PURPLE).pack(anchor="center", pady=(0, 20))
        
        hist_card = tk.Frame(right_panel, bg=BG_CARD, bd=1, relief="solid", highlightbackground=ACCENT_PURPLE, highlightthickness=1)
        hist_card.pack(fill="both", expand=True, ipady=15)
        
        columns = ("ID", "Date", "Exercise", "Sets", "Reps", "Weight")
        tree = ttk.Treeview(hist_card, columns=columns, show="headings", height=12)
        for col in columns:
            tree.heading(col, text=col)
            tree.column(col, anchor="center")
        tree.pack(fill="x", expand=True, padx=15, pady=15)
        
        # Populate history
        s_df = pd.read_sql_query("SELECT id, date, exercise, sets, reps, weight FROM strength ORDER BY date DESC LIMIT 50", conn)
        for _, row in s_df.iterrows():
            tree.insert("", "end", values=(row['id'], row['date'], row['exercise'], row['sets'], row['reps'], row['weight']))
            
        # Delete Log Entry Section
        del_frame = tk.Frame(hist_card, bg="transparent")
        del_frame.pack(fill="x", padx=15, pady=10)
        
        tk.Label(del_frame, text="Node Row ID Vector Value to Terminate:", font=("Arial", 9, "bold"), bg=BG_CARD, fg=TEXT_MAIN).pack(side="left", padx=5)
        del_id_entry = tk.Entry(del_frame, bg=BG_MAIN, fg=TEXT_MAIN, insertbackground=TEXT_MAIN, bd=1, relief="solid", font=("Arial", 10), width=10)
        del_id_entry.pack(side="left", padx=5)
        
        def purge_log():
            target_id = del_id_entry.get()
            if target_id.isdigit():
                cursor.execute("DELETE FROM strength WHERE id=?", (int(target_id),))
                conn.commit()
                self.controller.show_toast("Tracking Record Purged!")
                self.refresh()
            else:
                messagebox.showwarning("Invalid Input", "Please enter a valid numeric database row ID.")
                
        btn_purge = tk.Button(del_frame, text="TERMINATE DATA RECORD", bg=BG_MAIN, fg=ACCENT_PINK, activebackground=ACCENT_PINK, activeforeground=BG_MAIN,
                              font=("Arial", 9, "bold"), bd=1, relief="solid", cursor="hand2", padx=5, pady=5, command=purge_log)
        btn_purge.pack(side="left", padx=5)
        btn_purge.bind("<Enter>", lambda e: btn_purge.config(bg=ACCENT_PINK, fg=BG_MAIN))
        btn_purge.bind("<Leave>", lambda e: btn_purge.config(bg=BG_MAIN, fg=ACCENT_PINK))

# ==============================================================================
# APPLICATION ENTRY EXECUTION WINDOW BOOT
# ==============================================================================
if __name__ == "__main__":
    app = SummitApp()
    app.mainloop()