"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  REPORTS,
  TASKS,
  LEAVES,
  USERS,
  type Report,
  type Task,
  type Leave,
  type User,
  type TaskStatus,
} from "./mock-data";

/*
  Single client-side store seeded from mock-data.ts.

  Deliberately lightweight: one Context + useState arrays + CRUD callbacks.
  No reducer, no external state lib — enough to make every interaction work
  and stay in sync across pages (the (app) layout keeps this mounted while
  navigating). State resets on a full page reload, which is fine for a mock.
*/

type DataContextValue = {
  reports: Report[];
  tasks: Task[];
  leaves: Leave[];
  users: User[];
  pendingLeaveCount: number;

  addReport: (data: Omit<Report, "id">) => void;
  updateReport: (id: string, patch: Partial<Report>) => void;
  deleteReport: (id: string) => void;

  addTask: (data: Omit<Task, "id">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;

  addLeave: (data: Omit<Leave, "id">) => void;
  setLeaveStatus: (id: string, status: string) => void;

  addUser: (data: Omit<User, "id">) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  toggleUser: (id: string) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(REPORTS);
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [leaves, setLeaves] = useState<Leave[]>(LEAVES);
  const [users, setUsers] = useState<User[]>(USERS);

  // Monotonic id generator for newly created items.
  const counter = useRef(0);
  const mkId = useCallback((prefix: string) => {
    counter.current += 1;
    return `${prefix}-new-${counter.current}`;
  }, []);

  /* Reports */
  const addReport = useCallback(
    (data: Omit<Report, "id">) =>
      setReports((prev) => [{ id: mkId("r"), ...data }, ...prev]),
    [mkId]
  );
  const updateReport = useCallback(
    (id: string, patch: Partial<Report>) =>
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      ),
    []
  );
  const deleteReport = useCallback(
    (id: string) => setReports((prev) => prev.filter((r) => r.id !== id)),
    []
  );

  /* Tasks */
  const addTask = useCallback(
    (data: Omit<Task, "id">) =>
      setTasks((prev) => [...prev, { id: mkId("t"), ...data }]),
    [mkId]
  );
  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) =>
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    []
  );
  const deleteTask = useCallback(
    (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    []
  );
  const moveTask = useCallback(
    (id: string, status: TaskStatus) =>
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      ),
    []
  );

  /* Leaves */
  const addLeave = useCallback(
    (data: Omit<Leave, "id">) =>
      setLeaves((prev) => [{ id: mkId("lv"), ...data }, ...prev]),
    [mkId]
  );
  const setLeaveStatus = useCallback(
    (id: string, status: string) =>
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      ),
    []
  );

  /* Users */
  const addUser = useCallback(
    (data: Omit<User, "id">) =>
      setUsers((prev) => [...prev, { id: mkId("u"), ...data }]),
    [mkId]
  );
  const updateUser = useCallback(
    (id: string, patch: Partial<User>) =>
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u))),
    []
  );
  const toggleUser = useCallback(
    (id: string) =>
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
      ),
    []
  );

  const pendingLeaveCount = useMemo(
    () => leaves.filter((l) => l.status === "รออนุมัติ").length,
    [leaves]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      reports,
      tasks,
      leaves,
      users,
      pendingLeaveCount,
      addReport,
      updateReport,
      deleteReport,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      addLeave,
      setLeaveStatus,
      addUser,
      updateUser,
      toggleUser,
    }),
    [
      reports,
      tasks,
      leaves,
      users,
      pendingLeaveCount,
      addReport,
      updateReport,
      deleteReport,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      addLeave,
      setLeaveStatus,
      addUser,
      updateUser,
      toggleUser,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}
