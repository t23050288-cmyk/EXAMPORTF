import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usn, password, name, email, branch } = body;

    if (!usn || !password) {
      return NextResponse.json({ detail: "USN and password required" }, { status: 400 });
    }

    const { data: students } = await supabase
      .from("students")
      .select("*")
      .eq("usn", usn.trim().toUpperCase())
      .limit(1);

    let student = students?.[0];

    if (!student) {
      if (!name?.trim()) return NextResponse.json({ detail: "Full Name is required for registration." }, { status: 400 });
      if (!email?.trim()) return NextResponse.json({ detail: "Email Address is required for registration." }, { status: 400 });

      const password_hash = await bcrypt.hash(password, 10);
      const { data: newStudent, error } = await supabase
        .from("students")
        .insert({ usn: usn.trim().toUpperCase(), name: name.trim(), email: email.trim(), branch: branch || "CS", password_hash })
        .select().single();

      if (error || !newStudent) {
        return NextResponse.json({ detail: "Registration failed: " + (error?.message || "Unknown") }, { status: 500 });
      }

      await supabase.from("exam_status").insert({ student_id: newStudent.id, status: "not_started" });
      student = newStudent;
    } else {
      const valid = await bcrypt.compare(password, student.password_hash || "");
      if (!valid) return NextResponse.json({ detail: "Invalid roll number or password" }, { status: 401 });

      if (student.is_active_session && student.current_token) {
        return NextResponse.json({ detail: "You are already logged in from another device. Please log out there first." }, { status: 409 });
      }

      const { data: statusData } = await supabase
        .from("exam_status").select("status, started_at").eq("student_id", student.id).single();

      if (statusData?.status === "submitted") {
        return NextResponse.json({ detail: "You have already submitted this exam." }, { status: 403 });
      }
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "examguard_secret_2026");
    const currentBranch = branch || student.branch || "CS";
    const currentName = name || student.name || "Student";

    const token = await new SignJWT({ sub: student.id, usn: student.usn, name: currentName, branch: currentBranch })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("4h")
      .sign(secret);

    await supabase.from("students").update({
      is_active_session: true, current_token: token,
      ...(name ? { name } : {}), ...(email ? { email } : {}), ...(branch ? { branch } : {}),
    }).eq("id", student.id);

    const { data: configs } = await supabase.from("exam_config")
      .select("exam_title, duration_minutes, total_questions")
      .eq("is_active", true).order("updated_at", { ascending: false }).limit(1);

    const config = configs?.[0];
    const examTitle = config?.exam_title || "Initial Assessment";
    const duration = config?.duration_minutes || 20;

    const { count } = await supabase.from("questions").select("id", { count: "exact", head: true })
      .eq("branch", currentBranch).eq("exam_name", examTitle);

    return NextResponse.json({
      access_token: token, student_id: student.id, student_name: currentName,
      email: email || student.email, branch: currentBranch, exam_start_time: null,
      exam_duration_minutes: duration, exam_title: examTitle,
      total_questions: count || config?.total_questions || 30,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Login failed" }, { status: 500 });
  }
}
