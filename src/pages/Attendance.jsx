import { useState } from "react";
import { useTheme } from "../App";
import {
  Search, Filter, Download, CalendarCheck,
  UserCheck, UserX, Home, Clock,
  ChevronDown, ChevronLeft, ChevronRight,
  Edit2, X, Check
} from "lucide-react";
import { employees } from "../data/mockData";

// ── Helpers ───────────────────────────────────────────
function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

const avatarColors = [
  "#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16",
];
function getAvatarColor(id) {
  const idx = parseInt(id.replace("RWT", "")) % avatarColors.length;
  return avatarColors[idx];
}

// ── Extended attendance mock data ─────────────────────
const generateAttendanceData = () => {
  const records = [];
  const today = new Date("2026-05-07");
  // Generate 30 days of attendance for each employee
  employees.forEach((emp) => {
    for (let d = 0; d < 30; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) continue; // skip Sundays

      let status, checkIn, checkOut, hoursWorked;
      const rand = (parseInt(emp.id.replace("RWT", "")) + d) % 10;

      if (dayOfWeek === 6) {
        // Saturday - half day or absent
        if (rand < 5) {
          status = "Present"; checkIn = "09:30 AM"; checkOut = "02:00 PM"; hoursWorked = "4.5h";
        } else {
          status = "Absent"; checkIn = "--"; checkOut = "--"; hoursWorked = "--";
        }
      } else if (d === 0 && emp.status !== "Present") {
        status = emp.status; checkIn = "--"; checkOut = "--"; hoursWorked = "--";
      } else if (rand === 0) {
        status = "Absent"; checkIn = "--"; checkOut = "--"; hoursWorked = "--";
      } else if (rand === 1) {
        status = "Leave"; checkIn = "--"; checkOut = "--"; hoursWorked = "--";
      } else if (rand === 2) {
        status = "WFH"; checkIn = "09:15 AM"; checkOut = "06:30 PM"; hoursWorked = "9.25h";
      } else if (rand === 3) {
        status = "Present"; checkIn = "09:55 AM"; checkOut = "07:10 PM"; hoursWorked = "9.25h"; // late
      } else {
        status = "Present";
        const mins = [0, 5, 10, 15, 30][rand % 5];
        checkIn = `09:${String(mins).padStart(2, "0")} AM`;
        checkOut = `06:${String((rand * 7) % 60).padStart(2, "0")} PM`;
        hoursWorked = "9h";
      }

      records.push({
        id: `${emp.id}-${date.toISOString().split("T")[0]}`,
        empId: emp.id,
        empName: emp.name,
        role: emp.role,
        department: emp.department,
        date: date.toISOString().split("T")[0],
        dateLabel: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        status,
        checkIn,
        checkOut,
        hoursWorked,
        isLate: checkIn !== "--" && checkIn > "09:30 AM",
      });
    }
  });
  return records;
};

const allAttendance = generateAttendanceData();

// ── Status Badge ─────────────────────────────────────
function StatusBadge({ status, theme }) {
  const styles = {
    dark: {
      Present: { bg: "rgba(0,184,184,0.10)", border: "rgba(0,184,184,0.35)", color: "#00B8B8" },
      Absent:  { bg: "rgba(204,0,0,0.10)",   border: "rgba(204,0,0,0.35)",   color: "#CC0000" },
      Leave:   { bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.35)", color: "#C9922A" },
      WFH:     { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.2)", color: "#E8E8E8" },
    },
    light: {
      Present: { bg: "#E6F9F9", border: "#00B8B8", color: "#007A7A" },
      Absent:  { bg: "#FDECEA", border: "#CC0000", color: "#990000" },
      Leave:   { bg: "#FDF3E0", border: "#C9922A", color: "#8A5E00" },
      WFH:     { bg: "#F0F0F0", border: "#888888", color: "#444444" },
    },
  };
  const t = theme === "dark" ? "dark" : "light";
  const s = styles[t][status] || styles[t].WFH;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
      borderRadius: "4px", padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

// ── Edit Status Modal ─────────────────────────────────
function EditModal({ record, theme, onClose, onSave }) {
  const isDark = theme === "dark";
  const [status, setStatus] = useState(record.status);
  const [checkIn, setCheckIn] = useState(record.checkIn === "--" ? "" : record.checkIn);
  const [checkOut, setCheckOut] = useState(record.checkOut === "--" ? "" : record.checkOut);

  const inputStyle = {
    width: "100%",
    background: isDark ? "#1A1A1A" : "#F5F5F5",
    border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
    borderRadius: "6px",
    padding: "8px 12px",
    color: isDark ? "#F0F0F0" : "#111111",
    fontFamily: "Mulish, sans-serif",
    fontSize: "13px",
    outline: "none",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "420px",
          background: isDark ? "#111111" : "#FFFFFF",
          border: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: isDark ? "#F0F0F0" : "#111111" }}>
              Edit Attendance
            </p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#666666" }}>
              {record.empName} · {record.dateLabel}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "#555555" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Status */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: "#CC0000", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              STATUS
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["Present", "Absent", "Leave", "WFH"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontFamily: "Rajdhani, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: status === s ? "1px solid #CC0000" : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                    background: status === s ? "rgba(204,0,0,0.12)" : "transparent",
                    color: status === s ? "#CC0000" : isDark ? "#666666" : "#888888",
                    transition: "all 150ms",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Check In */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: "#CC0000", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              CHECK IN
            </label>
            <input
              type="text"
              placeholder="e.g. 09:30 AM"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Check Out */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: "#CC0000", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              CHECK OUT
            </label>
            <input
              type="text"
              placeholder="e.g. 06:30 PM"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}`, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              background: "transparent",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              color: isDark ? "#666666" : "#888888",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...record, status, checkIn: checkIn || "--", checkOut: checkOut || "--" })}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              background: "#CC0000",
              border: "1px solid #CC0000",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Attendance Page ──────────────────────────────
export default function Attendance() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("2026-05-07");
  const [editRecord, setEditRecord] = useState(null);
  const [records, setRecords] = useState(allAttendance);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const bg       = isDark ? "#0A0A0A" : "#F8F8F8";
  const cardBg   = isDark ? "#111111" : "#FFFFFF";
  const border   = isDark ? "#1E1E1E" : "#E8E8E8";
  const textPri  = isDark ? "#F0F0F0" : "#111111";
  const textMuted= isDark ? "#555555" : "#999999";

  // ── Today's summary ──────────────────────────────────
  const todayRecords = records.filter((r) => r.date === dateFilter);
  const presentCount = todayRecords.filter((r) => r.status === "Present").length;
  const absentCount  = todayRecords.filter((r) => r.status === "Absent").length;
  const leaveCount   = todayRecords.filter((r) => r.status === "Leave").length;
  const wfhCount     = todayRecords.filter((r) => r.status === "WFH").length;
  const lateCount    = todayRecords.filter((r) => r.isLate).length;

  // ── Filters ───────────────────────────────────────────
  const filtered = records.filter((r) => {
    const matchDate   = !dateFilter || r.date === dateFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    const matchDept   = deptFilter === "All" || r.department === deptFilter;
    const matchSearch = !search ||
      r.empName.toLowerCase().includes(search.toLowerCase()) ||
      r.empId.toLowerCase().includes(search.toLowerCase()) ||
      r.role.toLowerCase().includes(search.toLowerCase());
    return matchDate && matchStatus && matchDept && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const departments = ["All", ...new Set(employees.map((e) => e.department))];

  const statCards = [
    { label: "Present",  value: presentCount, icon: UserCheck, color: "#00B8B8" },
    { label: "Absent",   value: absentCount,  icon: UserX,     color: "#CC0000" },
    { label: "On Leave", value: leaveCount,   icon: CalendarCheck, color: "#C9922A" },
    { label: "WFH",      value: wfhCount,     icon: Home,      color: isDark ? "#888888" : "#555555" },
    { label: "Late",     value: lateCount,    icon: Clock,     color: "#6366F1" },
  ];

  // ── Save edit ─────────────────────────────────────────
  const handleSave = (updated) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditRecord(null);
  };

  // ── Stat card component ───────────────────────────────
  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div style={{
      background: cardBg,
      border: `1px solid ${border}`,
      borderRadius: "10px",
      padding: "16px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      flex: 1,
      minWidth: "130px",
    }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "8px",
        background: `${color}14`,
        border: `1px solid ${color}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: textPri, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, marginTop: "2px" }}>
          {label}
        </p>
      </div>
    </div>
  );

  // ── Table header cell ─────────────────────────────────
  const TH = ({ children, w }) => (
    <th style={{
      padding: "10px 14px",
      textAlign: "left",
      fontFamily: "Rajdhani, sans-serif",
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.15em",
      color: "#CC0000",
      background: isDark ? "#0D0D0D" : "#F5F5F5",
      borderBottom: `1px solid ${border}`,
      whiteSpace: "nowrap",
      width: w,
    }}>
      {children}
    </th>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri, lineHeight: 1 }}>
            Attendance Register
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginTop: "3px" }}>
            Track and manage daily employee attendance
          </p>
        </div>
        <button
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 16px",
            borderRadius: "7px",
            background: "transparent",
            border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
            color: isDark ? "#888888" : "#666666",
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Download size={14} />
          Export
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {statCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* ── Filters Bar ── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: "10px",
        padding: "14px 16px",
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        {/* Date */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          style={{
            padding: "7px 10px",
            borderRadius: "6px",
            border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
            background: isDark ? "#1A1A1A" : "#F5F5F5",
            color: textPri,
            fontFamily: "Mulish, sans-serif",
            fontSize: "13px",
            outline: "none",
          }}
        />

        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
          <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666666" }} />
          <input
            type="text"
            placeholder="Search employee, ID or role..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: "100%",
              paddingLeft: "32px",
              paddingRight: "12px",
              paddingTop: "7px",
              paddingBottom: "7px",
              borderRadius: "6px",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: isDark ? "#1A1A1A" : "#F5F5F5",
              color: textPri,
              fontFamily: "Mulish, sans-serif",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ position: "relative" }}>
          <Filter size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666666", pointerEvents: "none" }} />
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#666666", pointerEvents: "none" }} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{
              appearance: "none",
              paddingLeft: "28px",
              paddingRight: "28px",
              paddingTop: "7px",
              paddingBottom: "7px",
              borderRadius: "6px",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: isDark ? "#1A1A1A" : "#F5F5F5",
              color: textPri,
              fontFamily: "Mulish, sans-serif",
              fontSize: "13px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {["All", "Present", "Absent", "Leave", "WFH"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div style={{ position: "relative" }}>
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#666666", pointerEvents: "none" }} />
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            style={{
              appearance: "none",
              paddingLeft: "12px",
              paddingRight: "28px",
              paddingTop: "7px",
              paddingBottom: "7px",
              borderRadius: "6px",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: isDark ? "#1A1A1A" : "#F5F5F5",
              color: textPri,
              fontFamily: "Mulish, sans-serif",
              fontSize: "13px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
            ))}
          </select>
        </div>

        {/* Result count */}
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMuted, marginLeft: "auto" }}>
          {filtered.length} RECORD{filtered.length !== 1 ? "S" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <TH w="200px">EMPLOYEE</TH>
                <TH w="110px">DEPARTMENT</TH>
                <TH w="110px">DATE</TH>
                <TH w="100px">STATUS</TH>
                <TH w="110px">CHECK IN</TH>
                <TH w="110px">CHECK OUT</TH>
                <TH w="90px">HOURS</TH>
                <TH w="70px">ACTION</TH>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px", textAlign: "center" }}>
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "15px", color: textMuted }}>
                      No records found
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((rec, i) => {
                  const color = getAvatarColor(rec.empId);
                  const rowBg = i % 2 === 0
                    ? (isDark ? "#111111" : "#FFFFFF")
                    : (isDark ? "#0D0D0D" : "#FAFAFA");

                  return (
                    <tr
                      key={rec.id}
                      style={{ background: rowBg, borderBottom: `1px solid ${isDark ? "#161616" : "#F0F0F0"}` }}
                    >
                      {/* Employee */}
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            background: color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "11px" }}>
                              {getInitials(rec.empName)}
                            </span>
                          </div>
                          <div>
                            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, lineHeight: 1.2 }}>
                              {rec.empName}
                            </p>
                            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>
                              {rec.empId} · {rec.role}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#888888" : "#666666" }}>
                          {rec.department}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#888888" : "#666666" }}>
                          {rec.dateLabel}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                          <StatusBadge status={rec.status} theme={theme} />
                          {rec.isLate && rec.status === "Present" && (
                            <span style={{
                              fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 600,
                              color: "#6366F1", letterSpacing: "0.05em",
                            }}>
                              LATE ARRIVAL
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Check In */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          fontFamily: "Share Tech Mono, monospace",
                          fontSize: "12px",
                          color: rec.checkIn === "--" ? textMuted : (rec.isLate ? "#6366F1" : "#00B8B8"),
                        }}>
                          {rec.checkIn}
                        </span>
                      </td>

                      {/* Check Out */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          fontFamily: "Share Tech Mono, monospace",
                          fontSize: "12px",
                          color: rec.checkOut === "--" ? textMuted : (isDark ? "#AAAAAA" : "#555555"),
                        }}>
                          {rec.checkOut}
                        </span>
                      </td>

                      {/* Hours */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          fontFamily: "Share Tech Mono, monospace",
                          fontSize: "12px",
                          color: rec.hoursWorked === "--" ? textMuted : "#C9922A",
                        }}>
                          {rec.hoursWorked}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "11px 14px" }}>
                        <button
                          onClick={() => setEditRecord(rec)}
                          style={{
                            width: "30px", height: "30px", borderRadius: "6px",
                            border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                            background: "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            color: isDark ? "#555555" : "#888888",
                            transition: "all 150ms",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#CC0000";
                            e.currentTarget.style.color = "#CC0000";
                            e.currentTarget.style.background = "rgba(204,0,0,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isDark ? "#2A2A2A" : "#E0E0E0";
                            e.currentTarget.style.color = isDark ? "#555555" : "#888888";
                            e.currentTarget.style.background = "transparent";
                          }}
                          title="Edit attendance"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: `1px solid ${border}`,
          }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMuted }}>
              PAGE {page} OF {totalPages} · {filtered.length} RECORDS
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  width: "30px", height: "30px", borderRadius: "6px",
                  border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                  background: "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  color: page === 1 ? (isDark ? "#333333" : "#CCCCCC") : (isDark ? "#888888" : "#555555"),
                }}
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: "30px", height: "30px", borderRadius: "6px",
                      border: p === page ? "1px solid #CC0000" : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                      background: p === page ? "rgba(204,0,0,0.10)" : "transparent",
                      color: p === page ? "#CC0000" : (isDark ? "#888888" : "#555555"),
                      fontFamily: "Rajdhani, sans-serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  width: "30px", height: "30px", borderRadius: "6px",
                  border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                  background: "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  color: page === totalPages ? (isDark ? "#333333" : "#CCCCCC") : (isDark ? "#888888" : "#555555"),
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editRecord && (
        <EditModal
          record={editRecord}
          theme={theme}
          onClose={() => setEditRecord(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
