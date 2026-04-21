-- ============================================
-- order_attachments テーブルの RLS ポリシー
-- ============================================

-- 自組織のメンバーは自組織の添付ファイルを参照可能
CREATE POLICY "Organization members can view order attachments"
  ON order_attachments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- Service Role（API経由）は INSERT を許可（RLS をバイパスするため実質不要だが明示的に定義）
CREATE POLICY "Service role can insert order attachments"
  ON order_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 自組織のメンバーは自組織の添付ファイルを削除可能
CREATE POLICY "Organization members can delete order attachments"
  ON order_attachments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );
