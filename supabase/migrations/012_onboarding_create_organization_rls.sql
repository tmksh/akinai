-- ============================================
-- オンボーディング用: 組織・メンバー作成のRLS
-- ============================================

-- 認証済みユーザーは組織を作成できる
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ユーザーは「まだメンバーが1人もいない組織」に自分を最初のメンバー（オーナー）として追加できる
CREATE POLICY "Users can add themselves as first organization member"
  ON organization_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
    )
  );
