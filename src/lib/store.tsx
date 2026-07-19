"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import { getToken } from "./auth";
import { toast } from "@/components/ui/toaster";
import type { Report, Task, Leave, User, TaskStatus } from "./mock-data";
import {
  mapUser,
  mapReport,
  mapTask,
  mapLeave,
  LABEL_TO_TASK_STATUS,
  TH_TO_LEAVE_STATUS,
  type ApiProject,
  type ApiReport,
  type ApiTask,
  type ApiLeave,
  type ApiUser,
  type ReportInput,
  type TaskInput,
  type LeaveInput,
  type UserInput,
  type UserUpdateInput,
  type ApiRole,
  type ApiLeaveType,
  type RoleInput,
  type RoleUpdateInput,
} from "./mappers";

/*
  API-backed store. Fetches the real data from the backend on mount and
  performs every mutation over REST. The public shape mirrors the previous
  mock store (view types in, view types out) so the pages/components are
  untouched — only the data source changed.
*/

type DataContextValue = {
  users: User[];
  reports: Report[];
  tasks: Task[];
  leaves: Leave[];
  projects: ApiProject[];
  loading: boolean;
  error: string | null;
  pendingLeaveCount: number;
  refresh: () => Promise<void>;

  /** reports are paginated (load-more); these drive the "โหลดเพิ่ม" control. */
  reportsHasMore: boolean;
  loadingMoreReports: boolean;
  loadMoreReports: () => Promise<void>;

  addReport: (data: ReportInput) => Promise<boolean>;
  updateReport: (id: string, data: Partial<ReportInput>) => Promise<boolean>;
  deleteReport: (id: string) => Promise<boolean>;

  /** Returns the created task (with its new id) on success, or null on failure. */
  addTask: (data: TaskInput) => Promise<Task | null>;
  updateTask: (id: string, data: Partial<TaskInput>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  moveTask: (id: string, statusLabel: TaskStatus) => Promise<boolean>;
  /** Keep a board card's attachment count in sync after an upload/delete. */
  setTaskAttachmentCount: (id: string, count: number) => void;

  addLeave: (data: LeaveInput) => Promise<boolean>;
  /** statusLabel is the Thai label ("อนุมัติแล้ว" / "ปฏิเสธ"). */
  setLeaveStatus: (id: string, statusLabel: string) => Promise<boolean>;

  addUser: (data: UserInput) => Promise<boolean>;
  updateUser: (id: string, data: UserUpdateInput) => Promise<boolean>;
  toggleUser: (id: string) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;

  roles: ApiRole[];
  /** Admin-configured leave types (for the leave form's type picker). */
  leaveTypes: ApiLeaveType[];
  addRole: (data: RoleInput) => Promise<boolean>;
  updateRole: (id: string, data: RoleUpdateInput) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>;
};

/** Reports are loaded a page at a time (they accumulate daily). */
const REPORT_PAGE_SIZE = 40;

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportsHasMore, setReportsHasMore] = useState(false);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const reportsPageRef = useRef(1);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [u, p, r, t, l] = await Promise.all([
        api.get<{ users: ApiUser[] }>("/api/users"),
        api.get<{ projects: ApiProject[] }>("/api/projects"),
        api.get<{ reports: ApiReport[]; hasMore?: boolean }>(
          `/api/reports?limit=${REPORT_PAGE_SIZE}&page=1`
        ),
        api.get<{ tasks: ApiTask[] }>("/api/tasks"),
        api.get<{ leaves: ApiLeave[] }>("/api/leaves"),
      ]);
      setUsers(u.users.map(mapUser));
      setProjects(p.projects);
      setReports(r.reports.map(mapReport));
      reportsPageRef.current = 1;
      // Older backends ignore the params and return everything → no "more".
      setReportsHasMore(r.hasMore ?? false);
      setTasks(t.tasks.map(mapTask));
      setLeaves(l.leaves.map(mapLeave));
      // Roles are non-critical (and may 404 on an older backend) — never let
      // them break the main load.
      try {
        const rl = await api.get<{ roles: ApiRole[] }>("/api/roles");
        setRoles(rl.roles);
      } catch {
        setRoles([]);
      }
      // Configured leave types (for the leave form's type picker). Non-critical.
      try {
        const lt = await api.get<{ leaveTypes: ApiLeaveType[] }>(
          "/api/settings/leave-types"
        );
        setLeaveTypes(lt.leaveTypes);
      } catch {
        setLeaveTypes([]);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data load from the API on mount / after login.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  /**
   * Run a mutation, surface failures via a toast, keep state in sync, and
   * report success so callers can close a dialog / toast only on success.
   */
  const run = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn();
      return true;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "ดำเนินการไม่สำเร็จ");
      return false;
    }
  }, []);

  /* ------------------------------ Reports --------------------------- */
  const loadMoreReports = useCallback(async () => {
    setLoadingMoreReports(true);
    try {
      const next = reportsPageRef.current + 1;
      const r = await api.get<{ reports: ApiReport[]; hasMore?: boolean }>(
        `/api/reports?limit=${REPORT_PAGE_SIZE}&page=${next}`
      );
      setReports((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const more = r.reports.map(mapReport).filter((x) => !seen.has(x.id));
        return [...prev, ...more];
      });
      reportsPageRef.current = next;
      setReportsHasMore(r.hasMore ?? false);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "โหลดเพิ่มไม่สำเร็จ");
    } finally {
      setLoadingMoreReports(false);
    }
  }, []);

  const addReport = useCallback(
    (data: ReportInput) =>
      run(async () => {
        const { report } = await api.post<{ report: ApiReport }>(
          "/api/reports",
          data
        );
        setReports((prev) => [mapReport(report), ...prev]);
      }),
    [run]
  );
  const updateReport = useCallback(
    (id: string, data: Partial<ReportInput>) =>
      run(async () => {
        const { report } = await api.patch<{ report: ApiReport }>(
          `/api/reports/${id}`,
          data
        );
        setReports((prev) =>
          prev.map((r) => (r.id === id ? mapReport(report) : r))
        );
      }),
    [run]
  );
  const deleteReport = useCallback(
    (id: string) =>
      run(async () => {
        await api.del(`/api/reports/${id}`);
        setReports((prev) => prev.filter((r) => r.id !== id));
      }),
    [run]
  );

  /* ------------------------------- Tasks ---------------------------- */
  const addTask = useCallback(
    async (data: TaskInput): Promise<Task | null> => {
      try {
        const { task } = await api.post<{ task: ApiTask }>("/api/tasks", data);
        const mapped = mapTask(task);
        setTasks((prev) => [...prev, mapped]);
        return mapped;
      } catch (err) {
        toast(err instanceof ApiError ? err.message : "ดำเนินการไม่สำเร็จ");
        return null;
      }
    },
    []
  );
  const updateTask = useCallback(
    (id: string, data: Partial<TaskInput>) =>
      run(async () => {
        const { task } = await api.patch<{ task: ApiTask }>(
          `/api/tasks/${id}`,
          data
        );
        setTasks((prev) => prev.map((t) => (t.id === id ? mapTask(task) : t)));
      }),
    [run]
  );
  const deleteTask = useCallback(
    (id: string) =>
      run(async () => {
        await api.del(`/api/tasks/${id}`);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }),
    [run]
  );
  const moveTask = useCallback(
    (id: string, statusLabel: TaskStatus) =>
      run(async () => {
        const status = LABEL_TO_TASK_STATUS[statusLabel];
        // Optimistic: move the card immediately, snapshot for rollback.
        let snapshot: Task[] = [];
        setTasks((prev) => {
          snapshot = prev;
          return prev.map((t) => (t.id === id ? { ...t, status: statusLabel } : t));
        });
        try {
          const { task } = await api.patch<{ task: ApiTask }>(
            `/api/tasks/${id}/status`,
            { status }
          );
          setTasks((prev) => prev.map((t) => (t.id === id ? mapTask(task) : t)));
        } catch (err) {
          setTasks(snapshot); // revert on failure
          throw err; // let run() surface the error toast
        }
      }),
    [run]
  );
  const setTaskAttachmentCount = useCallback((id: string, count: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, attachmentCount: count } : t))
    );
  }, []);

  /* ------------------------------ Leaves ---------------------------- */
  const addLeave = useCallback(
    (data: LeaveInput) =>
      run(async () => {
        const { leave } = await api.post<{ leave: ApiLeave }>(
          "/api/leaves",
          data
        );
        setLeaves((prev) => [mapLeave(leave), ...prev]);
      }),
    [run]
  );
  const setLeaveStatus = useCallback(
    (id: string, statusLabel: string) =>
      run(async () => {
        const enumStatus = TH_TO_LEAVE_STATUS[statusLabel];
        const action = enumStatus === "APPROVED" ? "approve" : "reject";
        const { leave } = await api.patch<{ leave: ApiLeave }>(
          `/api/leaves/${id}/${action}`
        );
        setLeaves((prev) => prev.map((l) => (l.id === id ? mapLeave(leave) : l)));
      }),
    [run]
  );

  /* ------------------------------- Users ---------------------------- */
  const addUser = useCallback(
    (data: UserInput) =>
      run(async () => {
        const { user } = await api.post<{ user: ApiUser }>("/api/users", data);
        setUsers((prev) => [...prev, mapUser(user)]);
      }),
    [run]
  );
  const updateUser = useCallback(
    (id: string, data: UserUpdateInput) =>
      run(async () => {
        const { user } = await api.patch<{ user: ApiUser }>(
          `/api/users/${id}`,
          data
        );
        setUsers((prev) => prev.map((u) => (u.id === id ? mapUser(user) : u)));
      }),
    [run]
  );
  const toggleUser = useCallback(
    (id: string) =>
      run(async () => {
        const { user } = await api.patch<{ user: ApiUser }>(
          `/api/users/${id}/active`
        );
        setUsers((prev) => prev.map((u) => (u.id === id ? mapUser(user) : u)));
      }),
    [run]
  );
  const deleteUser = useCallback(
    (id: string) =>
      run(async () => {
        await api.del(`/api/users/${id}`);
        setUsers((prev) => prev.filter((u) => u.id !== id));
      }),
    [run]
  );

  /* ------------------------------- Roles ---------------------------- */
  const addRole = useCallback(
    (data: RoleInput) =>
      run(async () => {
        const { role } = await api.post<{ role: ApiRole }>("/api/roles", data);
        setRoles((prev) => [...prev, role]);
      }),
    [run]
  );
  const updateRole = useCallback(
    (id: string, data: RoleUpdateInput) =>
      run(async () => {
        const { role } = await api.patch<{ role: ApiRole }>(
          `/api/roles/${id}`,
          data
        );
        setRoles((prev) => prev.map((r) => (r.id === id ? role : r)));
      }),
    [run]
  );
  const deleteRole = useCallback(
    (id: string) =>
      run(async () => {
        await api.del(`/api/roles/${id}`);
        setRoles((prev) => prev.filter((r) => r.id !== id));
      }),
    [run]
  );

  const pendingLeaveCount = useMemo(
    () => leaves.filter((l) => l.status === "รออนุมัติ").length,
    [leaves]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      users,
      reports,
      tasks,
      leaves,
      projects,
      loading,
      error,
      pendingLeaveCount,
      refresh,
      reportsHasMore,
      loadingMoreReports,
      loadMoreReports,
      addReport,
      updateReport,
      deleteReport,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      setTaskAttachmentCount,
      addLeave,
      setLeaveStatus,
      addUser,
      updateUser,
      toggleUser,
      deleteUser,
      roles,
      leaveTypes,
      addRole,
      updateRole,
      deleteRole,
    }),
    [
      users,
      reports,
      tasks,
      leaves,
      projects,
      loading,
      error,
      pendingLeaveCount,
      refresh,
      reportsHasMore,
      loadingMoreReports,
      loadMoreReports,
      addReport,
      updateReport,
      deleteReport,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      setTaskAttachmentCount,
      addLeave,
      setLeaveStatus,
      addUser,
      updateUser,
      toggleUser,
      deleteUser,
      roles,
      leaveTypes,
      addRole,
      updateRole,
      deleteRole,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}

/**
 * Resolve a user's display name from their avatar key. Non-throwing (returns a
 * no-op lookup outside the provider) so presentational components like Avatar
 * can derive initials from the name instead of the email-based avatar key.
 */
export function useDisplayNameByKey(): (key: string) => string | undefined {
  const ctx = useContext(DataContext);
  return (key: string) => ctx?.users.find((u) => u.key === key)?.name;
}
