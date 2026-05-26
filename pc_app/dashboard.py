#!/usr/bin/env python3
"""Simple Smart Desk dashboard (demo data until serial link is added)."""

import random
import tkinter as tk
from tkinter import messagebox


def main() -> None:
    root = tk.Tk()
    root.title("Smart Desk Dashboard")
    root.geometry("300x200")

    title = tk.Label(root, text="SMART DESK", font=("Arial", 18))
    title.pack(pady=10)

    temp_label = tk.Label(root, text="Temperature: -- C")
    temp_label.pack()

    soil_label = tk.Label(root, text="Soil Moisture: -- %")
    soil_label.pack()

    mic_label = tk.Label(root, text="Mic Level: --")
    mic_label.pack()

    status_label = tk.Label(root, text="Plant Node: Offline")
    status_label.pack(pady=10)

    def fake_update() -> None:
        temp = round(random.uniform(20, 25), 1)
        soil = random.randint(30, 70)
        mic = random.randint(100, 3000)

        temp_label.config(text=f"Temperature: {temp} C")
        soil_label.config(text=f"Soil Moisture: {soil} %")
        mic_label.config(text=f"Mic Level: {mic}")
        status_label.config(text="Plant Node: Online (demo)")

        root.after(1000, fake_update)

    def on_close() -> None:
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    fake_update()

    try:
        root.mainloop()
    except tk.TclError as exc:
        messagebox.showerror("Dashboard error", str(exc))


if __name__ == "__main__":
    main()
