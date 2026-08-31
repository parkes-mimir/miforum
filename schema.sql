-- ============================================================
-- MiForum 数据库 Schema
-- 在 Supabase Dashboard > SQL Editor 中粘贴执行
-- ============================================================

-- 1. 用户资料表（注册时由触发器自动创建）
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  points     INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 帖子表
CREATE TABLE IF NOT EXISTS public.posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'tech',
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 评论表
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 每日签到表
CREATE TABLE IF NOT EXISTS public.check_ins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, check_in_date)
);

-- 5. 帖子点赞表
CREATE TABLE IF NOT EXISTS public.post_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_author     ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created     ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post     ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.check_ins(user_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_post_likes_post   ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user   ON public.post_likes(user_id);

-- ============================================================
-- 启用 Row Level Security
-- ============================================================
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 策略
-- ============================================================

-- profiles：公开可读，仅本人可改
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- posts：公开可读，登录可发，仅作者可改/删
CREATE POLICY "posts_select" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- comments：公开可读，登录可评，仅作者可改/删
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update" ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- check_ins：公开可读，登录可签（每天一次由 UNIQUE 约束）
CREATE POLICY "checkins_select" ON public.check_ins FOR SELECT USING (true);
CREATE POLICY "checkins_insert" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- post_likes：公开可读，登录可赞/取消
CREATE POLICY "likes_select" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 帖子统计视图（含作者名、点赞数、评论数）
-- ============================================================
CREATE OR REPLACE VIEW public.post_stats WITH (security_invoker = false) AS
SELECT
  p.id,
  p.title,
  p.content,
  p.category,
  p.author_id,
  p.created_at,
  pr.username AS author_name,
  COALESCE(pl.cnt, 0)::INT AS likes_count,
  COALESCE(cm.cnt, 0)::INT AS comments_count
FROM public.posts p
JOIN public.profiles pr ON p.author_id = pr.id
LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM public.post_likes GROUP BY post_id) pl ON p.id = pl.post_id
LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM public.comments  GROUP BY post_id) cm ON p.id = cm.post_id;

GRANT SELECT ON public.post_stats TO anon, authenticated;

-- ============================================================
-- 注册自动创建 profile 的触发器
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, points)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    0
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 种子数据（可选，测试用，生产环境可删除）
-- ============================================================
-- 注意：种子数据需要先有 auth.users，所以建议手动通过界面注册后再发帖
-- 下面仅插入分类提示，不做种子
