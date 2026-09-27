import { NextResponse } from "next/server";
import { getAdminUser } from "@/app/lib/adminAuth";
import { pushConfigured, sendAdminPush } from "@/app/lib/push";

// Send a test notification to the signed-in admin's own devices.
export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Notifications aren't set up yet: the VAPID keys are missing in Vercel." }, { status: 503 });
  }
  const result = await sendAdminPush(
    { title: "Notifications are on", body: "You'll get a message like this for every new booking.", url: "/admin", tag: "test" },
    { userId: admin.id },
  );
  return NextResponse.json(result);
}
