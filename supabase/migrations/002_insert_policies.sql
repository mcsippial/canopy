-- INSERT policies for signup flow (all Supabase calls happen from the browser)

-- Allow any authenticated user to create an organization (they become the owner)
create policy "Authenticated users can create orgs" on organizations
  for insert
  with check (auth.uid() is not null);

-- Allow authenticated users to insert their own membership record
create policy "Users can insert own membership" on organization_members
  for insert
  with check (user_id = auth.uid());

-- Allow org members to insert badge embeds for their org
create policy "Org members can insert badge embeds" on badge_embeds
  for insert
  with check (is_org_member(org_id));

-- Allow org members to insert agents
create policy "Org members can insert agents" on agents
  for insert
  with check (is_org_member(org_id));

-- Allow org members to insert covered users
create policy "Org members can insert covered users" on covered_users
  for insert
  with check (is_org_member(org_id));

-- Allow org members to insert claims
create policy "Org members can insert claims" on claims
  for insert
  with check (is_org_member(org_id));
