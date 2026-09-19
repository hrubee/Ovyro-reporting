import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function safeJson(val: any, fallback: any = {}) {
  if (typeof val !== "string") return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    organizationId: string;
    role: string;
  };

  try {
    const body = await req.json();
    const {
      id,
      outletId,
      templateId,
      date,
      shift,
      data,
      comments,
      correctiveAction,
      supervisorName,
      supervisorSigned,
      signatureData,
      complianceScore,
      status,
    } = body;

    if (!outletId || !templateId || !date) {
      return NextResponse.json(
        { error: "Missing required fields: outletId, templateId, date" },
        { status: 400 }
      );
    }

    const template = await prisma.formTemplate.findFirst({
      where: { id: templateId, organizationId: user.organizationId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found or access denied" }, { status: 404 });
    }

    const dataString = typeof data === "string" ? data : JSON.stringify(data || {});

    if (id) {
      const existing = await prisma.formSubmission.findFirst({
        where: { id, organizationId: user.organizationId },
      });

      if (!existing) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      const updated = await prisma.formSubmission.update({
        where: { id },
        data: {
          data: data !== undefined ? dataString : existing.data,
          shift: shift !== undefined ? shift : existing.shift,
          comments: comments !== undefined ? comments : existing.comments,
          correctiveAction: correctiveAction !== undefined ? correctiveAction : existing.correctiveAction,
          supervisorName: supervisorName !== undefined ? supervisorName : existing.supervisorName,
          supervisorSigned: supervisorSigned !== undefined ? supervisorSigned : existing.supervisorSigned,
          signatureData: signatureData !== undefined ? signatureData : existing.signatureData,
          complianceScore: complianceScore !== undefined ? complianceScore : existing.complianceScore,
          status: status || existing.status,
        },
      });

      return NextResponse.json({
        success: true,
        submission: { ...updated, data: safeJson(updated.data) },
      });
    }

    // Check if duplicate for same date, shift and template
    const existingSameShift = await prisma.formSubmission.findFirst({
      where: {
        organizationId: user.organizationId,
        outletId,
        templateId,
        date,
        shift: shift || null,
      },
    });

    if (existingSameShift) {
      const updated = await prisma.formSubmission.update({
        where: { id: existingSameShift.id },
        data: {
          data: dataString,
          comments: comments || existingSameShift.comments,
          correctiveAction: correctiveAction || existingSameShift.correctiveAction,
          supervisorName: supervisorName || existingSameShift.supervisorName,
          supervisorSigned: supervisorSigned !== undefined ? supervisorSigned : existingSameShift.supervisorSigned,
          signatureData: signatureData || existingSameShift.signatureData,
          complianceScore: complianceScore !== undefined ? complianceScore : existingSameShift.complianceScore,
          status: status || "SUBMITTED",
        },
      });
      return NextResponse.json({
        success: true,
        submission: { ...updated, data: safeJson(updated.data) },
        updatedExisting: true,
      });
    }

    const created = await prisma.formSubmission.create({
      data: {
        organizationId: user.organizationId,
        outletId,
        templateId,
        templateVersion: template.version,
        date,
        shift: shift || null,
        submittedById: user.id,
        supervisorName: supervisorName || "",
        supervisorSigned: !!supervisorSigned,
        signatureData: signatureData || null,
        complianceScore: complianceScore || 100,
        data: dataString,
        comments: comments || "",
        correctiveAction: correctiveAction || "",
        status: status || "SUBMITTED",
      },
    });

    return NextResponse.json({
      success: true,
      submission: { ...created, data: safeJson(created.data) },
    });
  } catch (err: any) {
    console.error("Submission POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save submission" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    organizationId: string;
    role: string;
  };

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const templateId = searchParams.get("templateId");
  const templateSlug = searchParams.get("templateSlug");
  const date = searchParams.get("date");
  const month = searchParams.get("month");
  const limit = parseInt(searchParams.get("limit") || "60", 10);

  try {
    const where: any = { organizationId: user.organizationId };

    if (outletId) where.outletId = outletId;
    if (templateId) where.templateId = templateId;
    if (templateSlug) {
      where.template = { slug: templateSlug };
    }
    if (date) where.date = date;
    if (month) {
      where.date = { startsWith: month };
    }

    const submissions = await prisma.formSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        template: {
          select: { id: true, slug: true, title: true, icon: true, category: true },
        },
        outlet: {
          select: { id: true, name: true, code: true, icon: true },
        },
      },
    });

    const parsed = submissions.map((s) => ({
      ...s,
      data: safeJson(s.data),
    }));

    return NextResponse.json({ submissions: parsed });
  } catch (err: any) {
    console.error("Submission GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch submissions" }, { status: 500 });
  }
}
