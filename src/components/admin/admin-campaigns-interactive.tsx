"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Campaign, CampaignStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Layers, Plus, Calendar, Trash2, CheckCircle, Sparkles } from "lucide-react";

interface Props {
  initialCampaigns: Campaign[];
}

export function AdminCampaignsInteractive({ initialCampaigns }: Props) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  // Realtime Live Sync for Campaigns
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestCampaigns = async () => {
      try {
        const { data } = await supabase
          .from("campaigns")
          .select("*")
          .order("created_at", { ascending: false });
        if (data) setCampaigns(data as Campaign[]);
      } catch (e) {}
    };

    const channel = supabase
      .channel("admin-campaigns-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => {
          fetchLatestCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    status: "OPEN" as CampaignStatus,
  });

  const handleStatusChange = async (id: string, newStatus: CampaignStatus) => {
    // 1. Instant Optimistic State (0ms)
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );

    // 2. Backend update
    const supabase = createClient();
    await supabase
      .from("campaigns")
      .update({ status: newStatus })
      .eq("id", id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบแคมเปญนี้ใช่หรือไม่?")) return;
    
    // 1. Instant Optimistic delete (0ms)
    setCampaigns((prev) => prev.filter((c) => c.id !== id));

    // 2. Backend delete
    const supabase = createClient();
    await supabase.from("campaigns").delete().eq("id", id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    const { data: newC, error } = await supabase
      .from("campaigns")
      .insert({
        title: formData.title,
        description: formData.description,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        status: formData.status,
      })
      .select()
      .single();

    setLoading(false);

    if (error || !newC) {
      setErrorMsg(error?.message || "สร้างแคมเปญไม่สำเร็จ");
    } else {
      setCampaigns([newC as Campaign, ...campaigns]);
      setIsModalOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header (No subtitle, clean Thai) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" />
            <span>จัดการแคมเปญ</span>
          </h1>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>สร้างแคมเปญใหม่</span>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="ยังไม่มีแคมเปญในระบบ"
          description="กดปุ่ม 'สร้างแคมเปญใหม่' ด้านบน เพื่อกำหนดช่วงเวลาเปิดรับพรีออเดอร์เสื้อกีฬาสาขา"
          action={
            <Button onClick={() => setIsModalOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-1" />
              <span>สร้างแคมเปญใหม่</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((c) => (
            <Card key={c.id} className="border-slate-200 bg-white rounded-2xl shadow-xs overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {c.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                    </p>
                  </div>
                  <Badge variant={c.status === "OPEN" ? "success" : "default"}>
                    {c.status}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>เริ่ม: {new Date(c.start_date).toLocaleDateString("th-TH")}</span>
                    <span className="mx-1">•</span>
                    <span>สิ้นสุด: {new Date(c.end_date).toLocaleDateString("th-TH")}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, e.target.value as CampaignStatus)}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DRAFT">DRAFT (ร่าง)</option>
                    <option value="OPEN">OPEN (เปิดรับออเดอร์)</option>
                    <option value="PAUSED">PAUSED (ชั่วคราว)</option>
                    <option value="CLOSED">CLOSED (ปิดรับออเดอร์)</option>
                  </select>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(c.id)}
                    className="rounded-xl p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span>สร้างแคมเปญสั่งซื้อใหม่</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">ชื่อแคมเปญ *</label>
                  <Input
                    placeholder="เช่น เปิดพรีออเดอร์เสื้อกีฬาสาขา CPE & IoT 2026"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">รายละเอียดแคมเปญ</label>
                  <Input
                    placeholder="คำอธิบายสั้นๆ..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">วันที่เริ่มต้น *</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">วันที่สิ้นสุด *</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" isLoading={loading} className="w-full mt-4 rounded-xl">
                  <span>บันทึกและสร้างแคมเปญ</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
