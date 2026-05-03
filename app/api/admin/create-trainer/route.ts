import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type TrainerKind = "trainer" | "kohai";

type Body = {
  full_name: string;
  email: string;
  phone?: string | null;
  dojo_id?: string | null;
  kind: TrainerKind;
  password?: string;
  can_attendance?: boolean;
  can_add_students?: boolean;
  can_create_trainings?: boolean;
  can_delete_students?: boolean;
  can_manage_topics?: boolean;
};

function randomPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!?#";
  let out = "Dokan-";
  for (let i = 0; i < 14; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body = (await request.json()) as Body;

    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "").trim();
    const phone = String(body.phone || "").trim() || null;
    const dojoId = body.dojo_id || null;
    const kind: TrainerKind =
      body.kind === "kohai" ? "kohai" : "trainer";
    const password = body.password?.trim() || randomPassword();

    if (!email)
      return NextResponse.json({ error: "Chýba email." }, { status: 400 });
    if (!fullName)
      return NextResponse.json({ error: "Chýba meno." }, { status: 400 });

    // 🔥 FIX: správne získanie aktuálneho usera z tokenu
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Nie si prihlásený (missing token)." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Nie si prihlásený." },
        { status: 401 }
      );
    }

    // kontrola admina
    const { data: currentTrainer } = await admin
      .from("trainers")
      .select("id, can_manage_trainers, email")
      .eq("email", user.email)
      .maybeSingle();

    if (!currentTrainer?.can_manage_trainers) {
      return NextResponse.json(
        { error: "Túto akciu môže robiť iba administrátor." },
        { status: 403 }
      );
    }

    // skontroluj existujúci auth user
    const { data: existingAuthUsers, error: listError } =
      await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (listError)
      return NextResponse.json(
        { error: listError.message },
        { status: 400 }
      );

    const existingAuthUser = existingAuthUsers.users.find(
      (u) => String(u.email || "").toLowerCase() === email
    );

    let authUserId = existingAuthUser?.id || null;
    let createdAuthUser = false;

    // vytvor auth usera ak neexistuje
    if (!authUserId) {
      const { data: created, error: createAuthError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: kind,
          },
        });

      if (createAuthError) {
        return NextResponse.json(
          { error: createAuthError.message },
          { status: 400 }
        );
      }

      authUserId = created.user.id;
      createdAuthUser = true;
    }

    // permissions
    const permissionPreset =
      kind === "kohai"
        ? {
            can_attendance: body.can_attendance ?? true,
            can_add_students: body.can_add_students ?? false,
            can_create_trainings:
              body.can_create_trainings ?? false,
            can_delete_students:
              body.can_delete_students ?? false,
            can_manage_topics:
              body.can_manage_topics ?? false,
            can_manage_trainers: false,
          }
        : {
            can_attendance: body.can_attendance ?? true,
            can_add_students: body.can_add_students ?? true,
            can_create_trainings:
              body.can_create_trainings ?? true,
            can_delete_students:
              body.can_delete_students ?? false,
            can_manage_topics:
              body.can_manage_topics ?? true,
            can_manage_trainers: false,
          };

    // 🔥 FIX: správny stĺpec user_id (nie auth_user_id)
    const { data: trainer, error: trainerError } = await admin
      .from("trainers")
      .upsert(
        {
          user_id: authUserId, // 🔥 DÔLEŽITÉ
          full_name: fullName,
          email,
          phone,
          role: kind,
          active: true,
          ...permissionPreset,
        },
        { onConflict: "email" }
      )
      .select("id, full_name, email")
      .single();

    if (trainerError) {
      return NextResponse.json(
        { error: trainerError.message },
        { status: 400 }
      );
    }

    // dojo priradenie
    if (dojoId) {
      const { error: linkError } = await admin
        .from("trainer_dojos")
        .upsert(
          {
            trainer_id: trainer.id,
            dojo_id: dojoId,
          },
          { onConflict: "trainer_id,dojo_id" }
        );

      if (linkError) {
        return NextResponse.json(
          { error: linkError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      trainer,
      created_auth_user: createdAuthUser,
      temporary_password: createdAuthUser ? password : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Neznáma chyba." },
      { status: 500 }
    );
  }
}
