import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const { classId, email } = await req.json();

  if (!classId || !email) {
    return NextResponse.json({ error: 'Thiếu classId hoặc email' }, { status: 400 });
  }

  // 1. Xác thực người gọi API là giáo viên của lớp này (dùng client thường, chịu RLS)
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const { data: cls } = await supabase.from('classes').select('id, teacher_id').eq('id', classId).is('deleted_at', null).single();

  if (!cls || cls.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Bạn không phải giáo viên của lớp này' }, { status: 403 });
  }

  // 2. Dùng service role để tra email -> user id (auth.users không expose qua anon key)
  const admin = createAdminClient();

  // listUsers không hỗ trợ filter theo email trực tiếp ở mọi version, nên lấy trang đầu rồi lọc.
  // Với app thật nên cache/paginate; ở đây đơn giản hoá cho scaffold.
  let foundUser = null;
  let page = 1;
  while (!foundUser && page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    foundUser = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (data.users.length < 200) break;
    page++;
  }

  if (!foundUser) {
    return NextResponse.json(
      { error: 'Không tìm thấy tài khoản với email này. Học sinh cần đăng ký tài khoản trước.' },
      { status: 404 }
    );
  }

  // 3. Không cho thêm tài khoản quản trị vào lớp với tư cách học sinh
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', foundUser.id).single();

  if (profile?.role === 'admin') {
    return NextResponse.json({ error: 'Không thể thêm tài khoản quản trị vào lớp' }, { status: 400 });
  }

  if (foundUser.id === user.id) {
    return NextResponse.json({ error: 'Bạn là giáo viên của lớp này' }, { status: 400 });
  }

  // 4. Không mời lại người đã là thành viên
  const { data: existing } = await admin
    .from('enrollments')
    .select('status')
    .eq('class_id', classId)
    .eq('student_id', foundUser.id)
    .maybeSingle();

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'Học sinh này đã ở trong lớp' }, { status: 400 });
  }

  // 5. Tạo/đặt lại lời mời (status='invited'); học sinh phải tự bấm "Tham gia"
  const { error: insertError } = await admin.from('enrollments').upsert(
    { class_id: classId, student_id: foundUser.id, status: 'invited' },
    { onConflict: 'class_id,student_id' }
  );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, studentName: profile?.full_name ?? email });
}
