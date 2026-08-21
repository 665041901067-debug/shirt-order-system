"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Profile, UserRole } from "@/types";
import { 
  createSingleUser, 
  updateUserDetails, 
  adminResetUserPassword,
  softDeleteUser, 
  restoreUser, 
  permanentDeleteUser, 
  importUsersBatch,
  cleanupDuplicateOrEmptyProfiles,
  BatchUserImportItem 
} from "@/services/admin-users";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Users, 
  Shield, 
  UserPlus, 
  FileSpreadsheet, 
  Edit, 
  Trash2, 
  RotateCcw, 
  Search, 
  X, 
  Save, 
  Upload, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  ClipboardPaste,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  Lock,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  Phone,
  UserCheck,
  ListFilter
} from "lucide-react";

interface Props {
  initialUsers: Profile[];
}

export function AdminUsersInteractive({ initialUsers }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "TRASH">("ACTIVE");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Add / Edit Form State
  const [userFormData, setUserFormData] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    student_id: "",
    phone: "",
    academic_year: "ปี 1",
    major: "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
    role: "STUDENT" as UserRole,
    new_password: "",
  });
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Quick Reset Password State
  const [resetTargetUser, setResetTargetUser] = useState<Profile | null>(null);
  const [quickNewPassword, setQuickNewPassword] = useState("");
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Batch Import State
  const [importTab, setImportTab] = useState<"FILE" | "PASTE">("FILE");
  const [pastedText, setPastedText] = useState("");
  const [parsedImportItems, setParsedImportItems] = useState<BatchUserImportItem[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & Sorting State
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "ID_ASC" | "ID_DESC" | "NAME_ASC" | "NAME_DESC" | "YEAR_ASC" | "YEAR_DESC" | "NEWEST"
  >("ID_ASC");
  const [dataFilter, setDataFilter] = useState<
    "ALL" | "MISSING_NICKNAME" | "MISSING_PHONE" | "HAS_PHONE"
  >("ALL");

  // Realtime Supabase Listener for profiles
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        async () => {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });
          if (data) {
            setUsers(
              data.map((u: any) => ({
                ...u,
                email: u.email || (u.student_id ? `${u.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th` : ""),
              })) as Profile[]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter Active vs Deleted
  const activeUsers = users.filter((u) => !u.is_deleted);
  const trashUsers = users.filter((u) => u.is_deleted === true);

  const displayedList = activeTab === "ACTIVE" ? activeUsers : trashUsers;

  const toggleSort = (type: "ID" | "NAME" | "YEAR") => {
    if (type === "ID") {
      setSortBy((prev) => (prev === "ID_ASC" ? "ID_DESC" : "ID_ASC"));
    } else if (type === "NAME") {
      setSortBy((prev) => (prev === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC"));
    } else if (type === "YEAR") {
      setSortBy((prev) => (prev === "YEAR_ASC" ? "YEAR_DESC" : "YEAR_ASC"));
    }
    setCurrentPage(1);
  };

  const filteredUsers = displayedList
    .filter((u) => {
      const q = search.toLowerCase();
      const email = u.email || (u.student_id ? `${u.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th` : "");
      const matchesSearch =
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.nickname?.toLowerCase().includes(q) ||
        u.student_id?.includes(q) ||
        u.phone?.includes(q) ||
        email.toLowerCase().includes(q);

      const matchesRole =
        selectedRoleFilter === "ALL" ||
        (selectedRoleFilter === "ADMIN" && u.role === "ADMIN") ||
        (selectedRoleFilter === "STUDENT" && u.role === "STUDENT");

      const matchesYear =
        selectedYearFilter === "ALL" ||
        (u.academic_year && u.academic_year.includes(selectedYearFilter));

      let matchesData = true;
      if (dataFilter === "MISSING_NICKNAME") {
        matchesData = !u.nickname || u.nickname.trim() === "";
      } else if (dataFilter === "MISSING_PHONE") {
        matchesData = !u.phone || u.phone.trim() === "" || u.phone === "-";
      } else if (dataFilter === "HAS_PHONE") {
        matchesData = Boolean(u.phone && u.phone.trim() !== "" && u.phone !== "-");
      }

      return matchesSearch && matchesRole && matchesYear && matchesData;
    })
    .sort((a, b) => {
      const aIdClean = (a.student_id || "").replace(/[^0-9]/g, "");
      const bIdClean = (b.student_id || "").replace(/[^0-9]/g, "");

      if (sortBy === "ID_ASC") {
        if (!aIdClean && !bIdClean) return 0;
        if (!aIdClean) return 1;
        if (!bIdClean) return -1;
        return aIdClean.localeCompare(bIdClean, undefined, { numeric: true });
      }
      if (sortBy === "ID_DESC") {
        if (!aIdClean && !bIdClean) return 0;
        if (!aIdClean) return 1;
        if (!bIdClean) return -1;
        return bIdClean.localeCompare(aIdClean, undefined, { numeric: true });
      }
      if (sortBy === "NAME_ASC") {
        const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim();
        const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim();
        return aName.localeCompare(bName, "th");
      }
      if (sortBy === "NAME_DESC") {
        const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim();
        const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim();
        return bName.localeCompare(aName, "th");
      }
      if (sortBy === "YEAR_ASC") {
        return (a.academic_year || "").localeCompare(b.academic_year || "", "th");
      }
      if (sortBy === "YEAR_DESC") {
        return (b.academic_year || "").localeCompare(a.academic_year || "", "th");
      }
      if (sortBy === "NEWEST") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      return 0;
    });

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Role Toggle
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingId(userId);
    const res = await updateUserDetails(userId, { role: newRole });
    setLoadingId(null);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success(`เปลี่ยนสิทธิ์เป็น ${newRole === "ADMIN" ? "ผู้ดูแลระบบ" : "นักศึกษา"} เรียบร้อยแล้ว`);
      router.refresh();
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์");
    }
  };

  // Open Edit Modal with Pre-filled Data
  const openEditModal = (user: Profile) => {
    setEditingUser(user);
    setUserFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      nickname: user.nickname || "",
      student_id: user.student_id || "",
      phone: user.phone || "",
      academic_year: user.academic_year || "ปี 1",
      major: user.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
      role: user.role || "STUDENT",
      new_password: "",
    });
    setShowFormPassword(false);
    setIsEditModalOpen(true);
  };

  // Open Quick Reset Password Modal
  const openResetPasswordModal = (user: Profile) => {
    setResetTargetUser(user);
    setQuickNewPassword(user.student_id || ""); // default to student ID with dash
    setShowQuickPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  // Submit Quick Reset Password
  const handleQuickResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    setResetPasswordLoading(true);
    const res = await adminResetUserPassword(resetTargetUser.id, quickNewPassword.trim());
    setResetPasswordLoading(false);

    if (res.success) {
      setIsResetPasswordModalOpen(false);
      setResetTargetUser(null);
      toast.success(`เปลี่ยนรหัสผ่านให้ ${resetTargetUser.first_name} เรียบร้อยแล้ว!`);
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
    }
  };

  // Submit Add User
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingId("add");

    const cleanPhone = userFormData.phone.replace(/[^0-9]/g, "");

    const res = await createSingleUser({
      ...userFormData,
      phone: cleanPhone,
    });

    setLoadingId(null);

    if (res.success && res.user) {
      setUsers((prev) => [res.user!, ...prev]);
      setIsAddModalOpen(false);
      setUserFormData({
        first_name: "",
        last_name: "",
        nickname: "",
        student_id: "",
        phone: "",
        academic_year: "ปี 1",
        major: "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
        role: "STUDENT",
        new_password: "",
      });
      toast.success("เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว!");
      router.refresh();
    } else {
      toast.error(res.error || "ไม่สามารถเพิ่มผู้ใช้ได้");
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoadingId(editingUser.id);

    const cleanPhone = userFormData.phone.replace(/[^0-9]/g, "");

    const res = await updateUserDetails(editingUser.id, {
      ...userFormData,
      phone: cleanPhone,
      new_password: userFormData.new_password.trim() ? userFormData.new_password.trim() : undefined,
    });

    setLoadingId(null);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, ...userFormData, phone: cleanPhone } : u
        )
      );
      setIsEditModalOpen(false);
      setEditingUser(null);
      toast.success("บันทึกการแก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว!");
      router.refresh();
    } else {
      toast.error(res.error || "ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  // Soft Delete
  const handleSoftDelete = async (userId: string) => {
    setLoadingId(userId);
    const res = await softDeleteUser(userId);
    setLoadingId(null);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_deleted: true } : u))
      );
      toast.success("ย้ายผู้ใช้ไปยังถังขยะเรียบร้อยแล้ว");
      router.refresh();
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาดในการลบผู้ใช้");
    }
  };

  // Restore Soft Deleted User
  const handleRestore = async (userId: string) => {
    setLoadingId(userId);
    const res = await restoreUser(userId);
    setLoadingId(null);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_deleted: false } : u))
      );
      toast.success("กู้คืนบัญชีผู้ใช้เรียบร้อยแล้ว!");
      router.refresh();
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาดในการกู้คืน");
    }
  };

  // Helper: Extract Student Records from any raw text or row arrays
  const processRawLines = (lines: string[]): BatchUserImportItem[] => {
    const items: BatchUserImportItem[] = [];
    const seenIds = new Set<string>();

    for (const line of lines) {
      if (!line || !line.trim()) continue;

      const cleanLine = line.replace(/[\u00A0\r\n\t]/g, " ").replace(/\s+/g, " ").trim();

      const idMatch = cleanLine.match(/\b(\d{10,13}[-\d]*|\d{10,14})\b/);
      if (!idMatch) continue;

      const studentId = idMatch[1];
      const digitsOnly = studentId.replace(/[^0-9]/g, "");

      if (seenIds.has(studentId) || digitsOnly.length < 8) continue;

      let remaining = cleanLine
        .replace(studentId, "")
        .replace(/^\d+[\.\)]?\s*/, "") // remove row number like 1. or 33)
        .trim();

      // Remove titles and prefixes cleanly before matching words
      remaining = remaining
        .replace(/น\.ส\./g, " ")
        .replace(/นางสาว/g, " ")
        .replace(/นาย/g, " ")
        .replace(/นาง/g, " ")
        .replace(/ด\.ช\./g, " ")
        .replace(/ด\.ญ\./g, " ")
        .replace(/อาจารย์|ดร\.|ผศ\.|รศ\./g, " ")
        .replace(/\b\d+\b/g, " ")
        .trim();

      const thaiWords = remaining.match(/[ก-๙]+/g);
      if (!thaiWords || thaiWords.length === 0) continue;

      if (
        remaining.includes("มหาวิทยาลัย") ||
        remaining.includes("รายชื่อนักศึกษา") ||
        remaining.includes("สาขาวิชา") ||
        remaining.includes("ปริญญา") ||
        remaining.includes("รหัสวิชา")
      ) {
        continue;
      }

      // Filter out stray single-character prefix letters
      const validWords = thaiWords.filter((w) => w !== "น" && w !== "ส");
      if (validWords.length === 0) continue;

      const firstName = validWords[0];
      const lastName = validWords.slice(1).join(" ") || "-";

      const email = `${digitsOnly}@mail.rmutk.ac.th`;

      const prefix = digitsOnly.slice(0, 2);
      let academicYear = "ปี 1";
      if (prefix === "69") academicYear = "ปี 1";
      else if (prefix === "68") academicYear = "ปี 2";
      else if (prefix === "67") academicYear = "ปี 3";
      else if (prefix === "66") academicYear = "ปี 4";

      const isExisting = users.some(
        (u) =>
          u.student_id === studentId ||
          (u.email && u.email.toLowerCase() === email.toLowerCase()) ||
          (u.first_name === firstName && u.last_name === lastName)
      );

      seenIds.add(studentId);
      items.push({
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        email,
        password: studentId,
        academic_year: academicYear,
        is_existing: isExisting,
      });
    }

    return items;
  };

  // Smart Universal File Parser for RMUTK Excel Sheet (.xlsx, .xls, .csv, .tsv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setImportError("");

    try {
      const buffer = await file.arrayBuffer();

      let items: BatchUserImportItem[] = [];
      try {
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const allLines: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:Z200");
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const rowTexts: string[] = [];
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = worksheet[cellAddress];
              if (cell) {
                const val = (cell.w || cell.v || "").toString().trim();
                if (val) rowTexts.push(val);
              }
            }
            if (rowTexts.length > 0) {
              allLines.push(rowTexts.join("   "));
            }
          }
        }

        items = processRawLines(allLines);
      } catch (sheetErr) {
        console.warn("SheetJS range walk fallback to plain text:", sheetErr);
      }

      if (items.length === 0) {
        const decoder = new TextDecoder("utf-8");
        const rawText = decoder.decode(buffer);
        const rawLines = rawText.split(/[\r\n]+/);
        items = processRawLines(rawLines);
      }

      if (items.length === 0) {
        setImportError(
          "ไม่พบรูปแบบรายชื่อนักศึกษาในไฟล์ โปรดลองคัดลอกตารางจาก Excel แล้วเลือกแท็บคัดลอกและวาง"
        );
      } else {
        setParsedImportItems(items);
        setSelectedImportIndices(items.map((_, i) => i));
        setIsImportModalOpen(true);
      }
    } catch (err: any) {
      setImportError("ไม่สามารถอ่านไฟล์ได้: " + (err?.message || "โปรดตรวจสอบรูปแบบไฟล์"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleParsePastedText = () => {
    setImportError("");
    if (!pastedText.trim()) {
      setImportError("กรุณาวางข้อความหรือตารางที่คัดลอกมาจาก Excel");
      return;
    }

    const lines = pastedText.split(/[\r\n]+/);
    const items = processRawLines(lines);

    if (items.length === 0) {
      setImportError(
        "ไม่พบรูปแบบรายชื่อนักศึกษาในข้อความที่วาง โปรดตรวจสอบว่ามีรหัสนักศึกษาและชื่อนามสกุล"
      );
    } else {
      setParsedImportItems(items);
      setSelectedImportIndices(items.map((_, i) => i));
    }
  };

  const handleConfirmBatchImport = async () => {
    const toImport = parsedImportItems.filter((_, i) => selectedImportIndices.includes(i));
    if (toImport.length === 0) return;

    setImporting(true);
    const res = await importUsersBatch(toImport);
    setImporting(false);

    if (res.success) {
      setIsImportModalOpen(false);
      setParsedImportItems([]);
      setPastedText("");
      toast.success(`สร้างและอัปเดตบัญชีผู้ใช้จำนวน ${res.count} รายการเรียบร้อยแล้ว!`);

      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) {
        setUsers(
          data.map((u: any) => ({
            ...u,
            email: u.email || (u.student_id ? `${u.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th` : ""),
          })) as Profile[]
        );
      }

      router.refresh();
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
    }
  };

  const [cleaningUp, setCleaningUp] = useState(false);
  const handleCleanupEmptyRows = async () => {
    if (!confirm("ต้องการล้างแถวที่ว่างและไม่มีรหัสนักศึกษาใช่หรือไม่?")) return;
    setCleaningUp(true);
    const res = await cleanupDuplicateOrEmptyProfiles();
    setCleaningUp(false);
    if (res.success) {
      toast.success(`ล้างแถวว่างที่ไม่มีรหัสเรียบร้อยแล้ว (${res.removedCount} รายการ)`);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) {
        setUsers(
          data.map((u: any) => ({
            ...u,
            email: u.email || (u.student_id ? `${u.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th` : ""),
          })) as Profile[]
        );
      }
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls, .csv, .tsv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header (No subtitle, pure Thai) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span>จัดการผู้ใช้งาน</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cleanup Empty Rows Button */}
          <Button
            onClick={handleCleanupEmptyRows}
            isLoading={cleaningUp}
            variant="outline"
            className="rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200"
            title="ลบแถวที่ไม่มีรหัสนักศึกษาและไม่มีออเดอร์"
          >
            <Trash2 className="h-4 w-4 mr-1.5 text-slate-400" />
            <span>ล้างแถวว่างที่ไม่มีรหัส</span>
          </Button>

          {/* Batch Importer Button */}
          <Button
            onClick={() => {
              setImportError("");
              setIsImportModalOpen(true);
            }}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            <span>นำเข้ารายชื่อนักศึกษา</span>
          </Button>

          {/* Add User Button */}
          <Button
            onClick={() => {
              setUserFormData({
                first_name: "",
                last_name: "",
                nickname: "",
                student_id: "",
                phone: "",
                academic_year: "ปี 1",
                major: "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
                role: "STUDENT",
                new_password: "",
              });
              setShowFormPassword(false);
              setIsAddModalOpen(true);
            }}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            <span>เพิ่มผู้ใช้ใหม่</span>
          </Button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("ACTIVE");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ACTIVE"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ผู้ใช้งานทั้งหมด ({activeUsers.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("TRASH");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "TRASH"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ถังขยะ ({trashUsers.length})
          </button>
        </div>

        <div className="w-full sm:w-80">
          <Input
            placeholder="ค้นหาชื่อ รหัสนักศึกษา อีเมล เบอร์โทร..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl text-xs h-10"
          />
        </div>
      </div>

      {/* Smart Secondary Filter & Sort Toolbar */}
      <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        {/* Row 1: Role, Academic Year, Sort By */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Role Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">สิทธิ์:</span>
            {[
              { key: "ALL", label: "ทั้งหมด" },
              { key: "STUDENT", label: "นักศึกษา" },
              { key: "ADMIN", label: "ผู้ดูแลระบบ" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setSelectedRoleFilter(r.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedRoleFilter === r.key
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Academic Year Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">ชั้นปี:</span>
            {["ALL", "ปี 1", "ปี 2", "ปี 3", "ปี 4"].map((yr) => (
              <button
                key={yr}
                onClick={() => {
                  setSelectedYearFilter(yr);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedYearFilter === yr
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {yr === "ALL" ? "ทุกชั้นปี" : yr}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="ตัวเลือกการเรียงลำดับ"
              className="bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="ID_ASC">รหัสนักศึกษา (น้อย ➜ มาก)</option>
              <option value="ID_DESC">รหัสนักศึกษา (มาก ➜ น้อย)</option>
              <option value="NAME_ASC">ชื่อ (ก ➜ ฮ)</option>
              <option value="NAME_DESC">ชื่อ (ฮ ➜ ก)</option>
              <option value="YEAR_ASC">ชั้นปี (ปี 1 ➜ ปี 4)</option>
              <option value="YEAR_DESC">ชั้นปี (ปี 4 ➜ ปี 1)</option>
              <option value="NEWEST">สร้างล่าสุด (ใหม่ ➜ เก่า)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Data Status Chips & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500 mr-1 shrink-0">สถานะข้อมูล:</span>
            {[
              { key: "ALL", label: "ข้อมูลทั้งหมด" },
              { key: "MISSING_NICKNAME", label: "ยังไม่ระบุชื่อเล่น" },
              { key: "MISSING_PHONE", label: "ยังไม่มีเบอร์โทร" },
              { key: "HAS_PHONE", label: "มีเบอร์โทรแล้ว" },
            ].map((df) => (
              <button
                key={df.key}
                onClick={() => {
                  setDataFilter(df.key as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                  dataFilter === df.key
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          {(search || selectedRoleFilter !== "ALL" || selectedYearFilter !== "ALL" || dataFilter !== "ALL" || sortBy !== "ID_ASC") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedRoleFilter("ALL");
                setSelectedYearFilter("ALL");
                setDataFilter("ALL");
                setSortBy("ID_ASC");
                setCurrentPage(1);
              }}
              className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline ml-auto"
            >
              <X className="h-3.5 w-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Content */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={activeTab === "ACTIVE" ? "ไม่พบข้อมูลผู้ใช้งาน" : "ไม่มีข้อมูลในถังขยะ"}
          description={
            activeTab === "ACTIVE"
              ? "ยังไม่มีผู้ใช้อยู่ในระบบ หรือไม่มีรายการตรงกับคำค้นหา"
              : "ไม่มีบัญชีผู้ใช้ที่ถูกลบอยู่ในขณะนี้"
          }
        />
      ) : (
        <>
          {/* Mobile Stacked Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedUsers.map((user) => {
              const studentEmail = user.email || (user.student_id ? `${user.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th` : "-");
              return (
                <Card key={user.id} className="border-slate-200 bg-white rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {user.first_name} {user.last_name} ({user.nickname || "ไม่ระบุชื่อเล่น"})
                      </h3>
                      <span className="text-xs text-blue-600 font-mono font-semibold block mt-0.5">
                        รหัส: {user.student_id || "-"}
                      </span>
                    </div>
                    <Badge variant={user.role === "ADMIN" ? "danger" : "secondary"}>
                      {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "นักศึกษา"}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100 font-mono">
                    <p className="flex items-center gap-1 text-slate-800 font-semibold">
                      <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>{studentEmail}</span>
                    </p>
                    <p><strong>เบอร์โทร:</strong> {user.phone || "-"}</p>
                    <p className="font-sans"><strong>ชั้นปี/สาขา:</strong> {user.academic_year || "-"} • {user.major}</p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    {activeTab === "ACTIVE" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(user)}
                          className="rounded-xl text-xs flex-1"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          <span>แก้ไข</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResetPasswordModal(user)}
                          className="rounded-xl text-xs flex-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-600" />
                          <span>แก้รหัสผ่าน</span>
                        </Button>

                        <Button
                          size="sm"
                          variant={user.role === "ADMIN" ? "outline" : "primary"}
                          onClick={() => handleRoleChange(user.id, user.role === "ADMIN" ? "STUDENT" : "ADMIN")}
                          isLoading={loadingId === user.id}
                          className="rounded-xl text-xs flex-1"
                        >
                          <Shield className="h-3.5 w-3.5 mr-1" />
                          <span>{user.role === "ADMIN" ? "สลับเป็นนักศึกษา" : "ตั้งเป็นผู้ดูแล"}</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleSoftDelete(user.id)}
                          className="rounded-xl text-xs p-2.5"
                          title="ย้ายลงถังขยะ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleRestore(user.id)}
                        className="rounded-xl text-xs w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        <span>กู้คืนบัญชีผู้ใช้</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th 
                      className="p-4 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("NAME")}
                      title="คลิกเพื่อสลับเรียงตามชื่อ"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>นักศึกษา / ชื่อเล่น</span>
                        {sortBy === "NAME_ASC" && <ArrowUp className="h-3.5 w-3.5 text-blue-600" />}
                        {sortBy === "NAME_DESC" && <ArrowDown className="h-3.5 w-3.5 text-blue-600" />}
                        {sortBy !== "NAME_ASC" && sortBy !== "NAME_DESC" && <ArrowUpDown className="h-3 w-3 text-slate-300" />}
                      </div>
                    </th>

                    <th 
                      className="p-4 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("ID")}
                      title="คลิกเพื่อสลับเรียงตามรหัสนักศึกษา"
                    >
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-sans">รหัสนักศึกษา</span>
                        {sortBy === "ID_ASC" && <ArrowUp className="h-3.5 w-3.5 text-blue-600" />}
                        {sortBy === "ID_DESC" && <ArrowDown className="h-3.5 w-3.5 text-blue-600" />}
                        {sortBy !== "ID_ASC" && sortBy !== "ID_DESC" && <ArrowUpDown className="h-3 w-3 text-slate-300" />}
                      </div>
                    </th>

                    <th className="p-4">อีเมลนักศึกษา</th>
                    <th className="p-4">เบอร์โทรศัพท์</th>
                    
                    <th 
                      className="p-4 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                      onClick={() => toggleSort("YEAR")}
                      title="คลิกเพื่อสลับเรียงตามชั้นปี"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ชั้นปี / สาขา</span>
                        {sortBy === "YEAR_ASC" && <ArrowUp className="h-3.5 w-3.5 text-blue-600" />}
                        {sortBy === "YEAR_DESC" && <ArrowDown className="h-3.5 w-3.5 text-blue-600" />}
                        {sortBy !== "YEAR_ASC" && sortBy !== "YEAR_DESC" && <ArrowUpDown className="h-3 w-3 text-slate-300" />}
                      </div>
                    </th>

                    <th className="p-4">สิทธิ์การใช้งาน</th>
                    <th className="p-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((user) => {
                    const studentEmail = user.email || (user.student_id ? `${user.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th` : "-");
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-slate-900 block">
                            {user.first_name} {user.last_name}
                          </span>
                          <span className="text-[11px] text-blue-600 font-semibold">
                            ({user.nickname || "ไม่ระบุชื่อเล่น"})
                          </span>
                        </td>

                        <td className="p-4 font-mono font-semibold text-slate-800">
                          {user.student_id || "-"}
                        </td>

                        <td className="p-4 font-mono text-blue-700 font-medium">
                          {studentEmail}
                        </td>

                        <td className="p-4 font-mono">{user.phone || "-"}</td>

                        <td className="p-4">
                          <span className="text-slate-800 font-medium">
                            {user.academic_year || "-"} • {user.major}
                          </span>
                        </td>

                        <td className="p-4">
                          <Badge variant={user.role === "ADMIN" ? "danger" : "secondary"}>
                            {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "นักศึกษา"}
                          </Badge>
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          {activeTab === "ACTIVE" ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(user)}
                                className="rounded-xl text-xs"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1 text-blue-600" />
                                <span>แก้ไข</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openResetPasswordModal(user)}
                                className="rounded-xl text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                                title="แอดมินตั้งรหัสผ่านใหม่ให้ผู้ใช้"
                              >
                                <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                <span>แก้รหัสผ่าน</span>
                              </Button>

                              <Button
                                size="sm"
                                variant={user.role === "ADMIN" ? "outline" : "primary"}
                                onClick={() =>
                                  handleRoleChange(user.id, user.role === "ADMIN" ? "STUDENT" : "ADMIN")
                                }
                                isLoading={loadingId === user.id}
                                className="rounded-xl text-xs"
                              >
                                <Shield className="h-3.5 w-3.5 mr-1" />
                                <span>{user.role === "ADMIN" ? "สลับเป็นนักศึกษา" : "ตั้งเป็นผู้ดูแล"}</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleSoftDelete(user.id)}
                                className="rounded-xl text-xs p-2"
                                title="ย้ายลงถังขยะ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleRestore(user.id)}
                              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              <span>กู้คืนผู้ใช้</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination Control Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">แสดงผล:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 รายการ / หน้า</option>
                <option value={10}>10 รายการ / หน้า</option>
                <option value={20}>20 รายการ / หน้า</option>
                <option value={50}>50 รายการ / หน้า</option>
              </select>
              <span className="text-slate-400">
                (ทั้งหมด {filteredUsers.length} รายการ)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-xl text-xs"
              >
                ก่อนหน้า
              </Button>
              <span className="font-extrabold text-slate-800 px-2">
                หน้า {safeCurrentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl text-xs"
              >
                ถัดไป
              </Button>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  <span>เพิ่มผู้ใช้งานใหม่</span>
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">ชื่อจริง *</label>
                    <Input
                      placeholder="เช่น สมชาย"
                      value={userFormData.first_name}
                      onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                      required
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">นามสกุล *</label>
                    <Input
                      placeholder="เช่น ใจดี"
                      value={userFormData.last_name}
                      onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                      required
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">ชื่อเล่น</label>
                    <Input
                      placeholder="เช่น บอล, โดม"
                      value={userFormData.nickname}
                      onChange={(e) => setUserFormData({ ...userFormData, nickname: e.target.value })}
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">รหัสนักศึกษา *</label>
                    <Input
                      placeholder="เช่น 66504190106-7"
                      value={userFormData.student_id}
                      onChange={(e) => setUserFormData({ ...userFormData, student_id: e.target.value })}
                      required
                      className="rounded-xl text-xs h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">เบอร์โทรศัพท์ (10 หลัก)</label>
                    <Input
                      placeholder="0812345678"
                      value={userFormData.phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                        setUserFormData({ ...userFormData, phone: digits });
                      }}
                      maxLength={10}
                      className="rounded-xl text-xs h-10 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">ชั้นปี</label>
                    <select
                      value={userFormData.academic_year}
                      onChange={(e) => setUserFormData({ ...userFormData, academic_year: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ปี 1">ชั้นปีที่ 1</option>
                      <option value="ปี 2">ชั้นปีที่ 2</option>
                      <option value="ปี 3">ชั้นปีที่ 3</option>
                      <option value="ปี 4">ชั้นปีที่ 4</option>
                      <option value="ศิษย์เก่า">ศิษย์เก่า</option>
                      <option value="อาจารย์/บุคลากร">อาจารย์ / บุคลากร</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">สิทธิ์การใช้งาน</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STUDENT">นักศึกษาทั่วไป</option>
                    <option value="ADMIN">ผู้ดูแลระบบ</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    isLoading={loadingId === "add"}
                    className="rounded-xl text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    <span>บันทึกเพิ่มผู้ใช้</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2: Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-600" />
                  <span>แก้ไขข้อมูลผู้ใช้งาน</span>
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">ชื่อจริง *</label>
                    <Input
                      value={userFormData.first_name}
                      onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                      required
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">นามสกุล *</label>
                    <Input
                      value={userFormData.last_name}
                      onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                      required
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">ชื่อเล่น</label>
                    <Input
                      value={userFormData.nickname}
                      onChange={(e) => setUserFormData({ ...userFormData, nickname: e.target.value })}
                      className="rounded-xl text-xs h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">รหัสนักศึกษา *</label>
                    <Input
                      value={userFormData.student_id}
                      onChange={(e) => setUserFormData({ ...userFormData, student_id: e.target.value })}
                      required
                      className="rounded-xl text-xs h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">เบอร์โทรศัพท์ (10 หลัก)</label>
                    <Input
                      value={userFormData.phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                        setUserFormData({ ...userFormData, phone: digits });
                      }}
                      maxLength={10}
                      className="rounded-xl text-xs h-10 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">ชั้นปี</label>
                    <select
                      value={userFormData.academic_year}
                      onChange={(e) => setUserFormData({ ...userFormData, academic_year: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ปี 1">ชั้นปีที่ 1</option>
                      <option value="ปี 2">ชั้นปีที่ 2</option>
                      <option value="ปี 3">ชั้นปีที่ 3</option>
                      <option value="ปี 4">ชั้นปีที่ 4</option>
                      <option value="ศิษย์เก่า">ศิษย์เก่า</option>
                      <option value="อาจารย์/บุคลากร">อาจารย์ / บุคลากร</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">สิทธิ์การใช้งาน</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STUDENT">นักศึกษาทั่วไป</option>
                    <option value="ADMIN">ผู้ดูแลระบบ</option>
                  </select>
                </div>

                {/* Optional Password Reset by Admin */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                    <span>ตั้งรหัสผ่านใหม่ให้ผู้ใช้ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>
                  </div>
                  <div className="relative">
                    <Input
                      type={showFormPassword ? "text" : "password"}
                      placeholder="ระบุรหัสผ่านใหม่ (เช่น 66504190106-7 หรือรหัสใหม่)"
                      value={userFormData.new_password}
                      onChange={(e) => setUserFormData({ ...userFormData, new_password: e.target.value })}
                      className="pr-10 rounded-xl text-xs h-10 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    isLoading={loadingId === editingUser.id}
                    className="rounded-xl text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2.5: Quick Reset Password Modal */}
      {isResetPasswordModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-600" />
                  <span>รีเซ็ตรหัสผ่านนักศึกษา</span>
                </h3>
                <button
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-slate-800">
                  {resetTargetUser.first_name} {resetTargetUser.last_name} ({resetTargetUser.nickname || "-"})
                </p>
                <p className="font-mono text-blue-600 font-semibold">
                  รหัส: {resetTargetUser.student_id}
                </p>
                <p className="font-mono text-slate-500 text-[11px]">
                  อีเมล: {resetTargetUser.email || `${resetTargetUser.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th`}
                </p>
              </div>

              <form onSubmit={handleQuickResetPasswordSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">กำหนดรหัสผ่านใหม่ *</label>
                  <div className="relative">
                    <Input
                      type={showQuickPassword ? "text" : "password"}
                      value={quickNewPassword}
                      onChange={(e) => setQuickNewPassword(e.target.value)}
                      required
                      className="pr-10 rounded-xl text-xs h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQuickPassword(!showQuickPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showQuickPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickNewPassword(resetTargetUser.student_id || "")}
                    className="text-[11px] text-blue-600 hover:underline font-bold"
                  >
                    ใช้รหัสนักศึกษาแบบมีขีด ({resetTargetUser.student_id})
                  </button>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsResetPasswordModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    isLoading={resetPasswordLoading}
                    className="rounded-xl text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    <span>ยืนยันตั้งรหัสผ่านใหม่</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 3: Universal Importer Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <Card className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      นำเข้ารายชื่อนักศึกษาและสร้างบัญชีอัตโนมัติ
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedImportItems([]);
                    setPastedText("");
                    setImportError("");
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {importError && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-2xl flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Import Method Tabs */}
              {parsedImportItems.length === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <button
                      onClick={() => setImportTab("FILE")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        importTab === "FILE"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>วิธีที่ 1: อัปโหลดไฟล์</span>
                    </button>

                    <button
                      onClick={() => setImportTab("PASTE")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        importTab === "PASTE"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      <span>วิธีที่ 2: คัดลอกและวางตารางจาก Excel</span>
                    </button>
                  </div>

                  {importTab === "FILE" ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
                    >
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-1">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800">
                        คลิกเพื่อเลือกไฟล์รายชื่อนักศึกษา (.xlsx, .xls, .csv)
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        ระบบจะสแกนหาคอลัมน์รหัสประจำตัวและชื่อสกุลให้อัตโนมัติ
                      </p>
                      <Button size="sm" className="rounded-xl bg-emerald-600 text-white text-xs font-bold">
                        เลือกไฟล์จากคอมพิวเตอร์
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-blue-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          <span>วิธีคัดลอกจาก Excel มาวาง:</span>
                        </p>
                        <p className="text-[11px] text-slate-600">
                          1. เปิดไฟล์ Excel ในคอมพิวเตอร์ แล้วลากคลุมแถวนักศึกษาทั้งหมด<br/>
                          2. กด <strong>Ctrl + C</strong> เพื่อคัดลอก<br/>
                          3. คลิกช่องด้านล่างนี้แล้วกด <strong>Ctrl + V</strong> แล้วกดปุ่ม &quot;สแกนข้อมูล&quot;
                        </p>
                      </div>

                      <textarea
                        rows={6}
                        placeholder={"ตัวอย่างข้อมูลที่วาง:\n1  66504190101-8  นางสาว ชนัญชิดา จรูญจันทน์\n2  66504190102-6  นางสาว ชนิกานต์ แก้วยูง"}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />

                      <Button
                        onClick={handleParsePastedText}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 shadow-xs"
                      >
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        <span>สแกนข้อมูลและตรวจสอบรายชื่อ ({pastedText.trim().split('\n').filter(Boolean).length} แถว)</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Table Preview when items are parsed */}
              {parsedImportItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>
                          พบข้อมูลนักศึกษาทั้งหมด {parsedImportItems.length} คน
                        </span>
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                          สร้างบัญชีใหม่: {parsedImportItems.filter((i) => !i.is_existing).length} คน
                        </span>
                        <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                          มีในระบบแล้ว (จะอัปเดตข้อมูล): {parsedImportItems.filter((i) => i.is_existing).length} คน
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setParsedImportItems([]);
                        setPastedText("");
                      }}
                      className="text-xs text-blue-600 hover:underline font-bold self-start sm:self-auto"
                    >
                      เลือกไฟล์ใหม่ / วางข้อความใหม่
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0">
                        <tr>
                          <th className="p-3 w-10">
                            <input
                              type="checkbox"
                              checked={selectedImportIndices.length === parsedImportItems.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedImportIndices(parsedImportItems.map((_, i) => i));
                                } else {
                                  setSelectedImportIndices([]);
                                }
                              }}
                              className="rounded"
                            />
                          </th>
                          <th className="p-3">สถานะบัญชี</th>
                          <th className="p-3">รหัสนักศึกษา</th>
                          <th className="p-3">ชื่อ - นามสกุล</th>
                          <th className="p-3">อีเมล</th>
                          <th className="p-3">รหัสผ่านเริ่มต้น</th>
                          <th className="p-3">ชั้นปี</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedImportItems.map((item, idx) => {
                          const isSelected = selectedImportIndices.includes(idx);
                          return (
                            <tr key={idx} className={`hover:bg-slate-50 ${isSelected ? "bg-blue-50/20" : ""}`}>
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedImportIndices([...selectedImportIndices, idx]);
                                    } else {
                                      setSelectedImportIndices(selectedImportIndices.filter((i) => i !== idx));
                                    }
                                  }}
                                  className="rounded"
                                />
                              </td>
                              <td className="p-3">
                                {item.is_existing ? (
                                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                    มีในระบบแล้ว
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                    บัญชีใหม่
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-bold text-blue-600">{item.student_id}</td>
                              <td className="p-3 font-bold text-slate-900">{item.first_name} {item.last_name}</td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">{item.email}</td>
                              <td className="p-3 font-mono text-slate-500">{item.password}</td>
                              <td className="p-3">{item.academic_year}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-semibold">
                      เลือกอยู่ {selectedImportIndices.length} จาก {parsedImportItems.length} คน
                    </span>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsImportModalOpen(false);
                          setParsedImportItems([]);
                          setPastedText("");
                        }}
                        className="rounded-xl text-xs flex-1 sm:flex-none"
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        onClick={handleConfirmBatchImport}
                        isLoading={importing}
                        disabled={selectedImportIndices.length === 0}
                        className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex-1 sm:flex-none shadow-md"
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        <span>ยืนยันสร้างบัญชี ({selectedImportIndices.length} คน)</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
