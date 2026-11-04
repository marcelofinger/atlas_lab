create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.clientes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  cliente_id text not null,
  empresa text not null,
  contato text,
  email_aceite text,
  segmento text,
  regiao text,
  primary key (owner_id, cliente_id)
);

create table if not exists public.vendedores (
  owner_id uuid not null references auth.users(id) on delete cascade,
  vendedor_id text not null,
  nome text not null,
  regiao text not null,
  primary key (owner_id, vendedor_id)
);

create table if not exists public.produtos (
  owner_id uuid not null references auth.users(id) on delete cascade,
  produto_id text not null,
  nome text not null,
  preco_unitario numeric(14,2) not null check (preco_unitario > 0),
  custo_unitario numeric(14,2) not null check (custo_unitario >= 0),
  escopo text,
  primary key (owner_id, produto_id)
);

create table if not exists public.metas (
  owner_id uuid not null references auth.users(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  meta_vendas_ganhas numeric(14,2) not null check (meta_vendas_ganhas > 0),
  primary key (owner_id, mes)
);

create table if not exists public.propostas (
  owner_id uuid not null references auth.users(id) on delete cascade,
  proposta_id text not null,
  versao integer not null check (versao > 0),
  vigente boolean not null default true,
  cliente_id text not null,
  vendedor_id text not null,
  produto_id text not null,
  regiao text not null,
  canal text not null check (canal in ('Indicacao','Inbound','Outbound')),
  data_criacao date not null,
  data_fechamento date,
  validade date not null,
  etapa text not null check (etapa in ('Qualificacao','Proposta','Negociacao','Ganho','Perdido')),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(14,2) not null check (preco_unitario > 0),
  desconto_pct numeric not null default 0 check (desconto_pct between 0 and 1),
  custo_total numeric(14,2) not null check (custo_total >= 0),
  aprovacao_desconto text,
  probabilidade numeric not null default 0 check (probabilidade between 0 and 1),
  condicao_pagamento text not null,
  motivo_perda text check (motivo_perda in ('Preco','Prazo','Concorrente')),
  proxima_acao text,
  valor_bruto numeric(14,2) not null,
  valor_liquido numeric(14,2) not null,
  margem_pct numeric,
  valor_ponderado numeric(14,2) not null default 0,
  row_version integer not null default 1 check (row_version > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, proposta_id, versao),
  foreign key (owner_id, cliente_id) references public.clientes(owner_id, cliente_id),
  foreign key (owner_id, vendedor_id) references public.vendedores(owner_id, vendedor_id),
  foreign key (owner_id, produto_id) references public.produtos(owner_id, produto_id),
  check (data_fechamento is null or data_fechamento >= data_criacao),
  check ((etapa = 'Perdido') = (motivo_perda is not null)),
  check ((etapa in ('Ganho','Perdido')) = (data_fechamento is not null))
);
create unique index if not exists propostas_uma_versao_vigente_idx
  on public.propostas(owner_id, proposta_id) where vigente;
create index if not exists propostas_owner_stage_idx on public.propostas(owner_id, etapa, vigente);
create index if not exists propostas_owner_close_idx on public.propostas(owner_id, data_fechamento) where etapa = 'Ganho';

create table if not exists public.aprovacoes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  aprovacao_id text not null,
  proposta_id text,
  lote text,
  versao integer,
  limite_desconto numeric not null check (limite_desconto between 0 and 1),
  aprovador text not null,
  aprovado_em timestamptz not null,
  primary key (owner_id, aprovacao_id),
  check (proposta_id is not null or lote is not null)
);

create table if not exists public.historico_propostas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  proposta_id text not null,
  versao integer not null,
  de text,
  para text,
  ocorrido_em timestamptz not null default now(),
  origem text not null default 'ui',
  provider_message_id text,
  ator uuid references auth.users(id),
  foreign key (owner_id, proposta_id, versao) references public.propostas(owner_id, proposta_id, versao) on delete cascade
);
create index if not exists historico_owner_time_idx on public.historico_propostas(owner_id, ocorrido_em desc);

create table if not exists public.email_processamentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mailbox_id text not null,
  provider_message_id text not null,
  provider_thread_id text,
  recebido_em timestamptz,
  codigo_extraido text,
  versao_extraida integer,
  decisao text,
  motivo text,
  estado text not null default 'revisao',
  correlation_id uuid not null default gen_random_uuid(),
  unique (mailbox_id, provider_message_id)
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  proposta_id text not null,
  versao integer not null,
  tipo_confirmacao text not null default 'aceite',
  processamento_id uuid references public.email_processamentos(id),
  destinatario_validado text,
  assunto text not null,
  corpo text not null,
  estado text not null default 'aguardando_destinatario' check (estado in ('aguardando_destinatario','pendente','enviando','enviado','falhou','envio_incerto')),
  provider_sent_message_id text,
  tentativas integer not null default 0,
  erro text,
  updated_at timestamptz not null default now(),
  foreign key (owner_id, proposta_id, versao) references public.propostas(owner_id, proposta_id, versao),
  unique (owner_id, proposta_id, versao, tipo_confirmacao)
);

create table if not exists public.import_batches (
  owner_id uuid not null references auth.users(id) on delete cascade,
  batch_id text not null,
  sha256 text not null,
  imported_at timestamptz not null default now(),
  row_count integer not null,
  result jsonb not null default '{}'::jsonb,
  primary key (owner_id, batch_id),
  unique (owner_id, sha256)
);

do $$
declare t text;
begin
  foreach t in array array['clientes','vendedores','produtos','metas','propostas','aprovacoes','historico_propostas','email_processamentos','email_outbox','import_batches'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

grant select, insert, update, delete on public.clientes, public.vendedores, public.produtos, public.metas to authenticated;
grant select, insert, update on public.propostas to authenticated;
grant select on public.historico_propostas, public.email_processamentos, public.email_outbox to authenticated;

create policy clientes_owner_all on public.clientes for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy vendedores_owner_all on public.vendedores for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy produtos_owner_all on public.produtos for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy metas_owner_all on public.metas for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy propostas_owner_select on public.propostas for select to authenticated using ((select auth.uid()) = owner_id);
create policy propostas_owner_insert on public.propostas for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy propostas_owner_update on public.propostas for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy historico_owner_select on public.historico_propostas for select to authenticated using ((select auth.uid()) = owner_id);
create policy email_processamentos_owner_select on public.email_processamentos for select to authenticated using ((select auth.uid()) = owner_id);
create policy email_outbox_owner_select on public.email_outbox for select to authenticated using ((select auth.uid()) = owner_id);
create policy import_batches_owner_select on public.import_batches for select to authenticated using ((select auth.uid()) = owner_id);
-- aprovacoes não tem grants/policies para authenticated: leitura/escrita somente por processos administrativos do servidor.

create or replace function private.compute_proposal_values()
returns trigger language plpgsql set search_path = '' as $$
declare v_region text;
begin
  select v.regiao into v_region from public.vendedores v where v.owner_id = new.owner_id and v.vendedor_id = new.vendedor_id;
  if v_region is null then raise exception 'Responsável não encontrado para este proprietário'; end if;
  new.regiao := v_region;
  new.valor_bruto := round(new.quantidade * new.preco_unitario, 2);
  new.valor_liquido := round(new.valor_bruto * (1 - new.desconto_pct), 2);
  new.margem_pct := case when new.valor_liquido > 0 then (new.valor_liquido - new.custo_total) / new.valor_liquido else 0 end;
  new.probabilidade := case new.etapa when 'Qualificacao' then 0.20 when 'Proposta' then 0.50 when 'Negociacao' then 0.75 when 'Ganho' then 1 else 0 end;
  new.valor_ponderado := case when new.etapa in ('Qualificacao','Proposta','Negociacao') then round(new.valor_liquido * new.probabilidade, 2) else 0 end;
  new.updated_at := now();
  return new;
end;
$$;
create trigger propostas_compute_values before insert or update on public.propostas for each row execute function private.compute_proposal_values();

create or replace function private.protect_proposal_transitions()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.owner_id <> old.owner_id or new.proposta_id <> old.proposta_id or new.versao <> old.versao then
      raise exception 'Identidade da proposta não pode ser alterada';
    end if;
    if new.vigente is distinct from old.vigente and current_user = 'authenticated' then raise exception 'Use a função autorizada reemitir_proposta para trocar a versão vigente'; end if;
    if not old.vigente and current_user = 'authenticated' then raise exception 'Versão anterior é preservada e não pode ser alterada'; end if;
    if old.etapa = 'Ganho' then raise exception 'Proposta ganha é imutável'; end if;
    if old.etapa = 'Perdido' and new.etapa <> 'Perdido' then raise exception 'Reabertura exige revisão comercial'; end if;
    if new.etapa = 'Ganho' and old.etapa <> 'Ganho' and current_user = 'authenticated' then raise exception 'Use a função autorizada registrar_ganho'; end if;
  else
    if new.etapa = 'Ganho' and current_user = 'authenticated' then raise exception 'Use a função autorizada registrar_ganho'; end if;
    if not new.vigente and current_user = 'authenticated' then raise exception 'Use a função autorizada reemitir_proposta'; end if;
  end if;
  if new.etapa = 'Perdido' and new.motivo_perda is null then raise exception 'Motivo de perda é obrigatório'; end if;
  return new;
end;
$$;
create trigger propostas_protect_transitions before insert or update on public.propostas for each row execute function private.protect_proposal_transitions();

create or replace function private.audit_proposal_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_from text; v_to text; v_origin text; v_provider_message_id text;
begin
  v_origin := coalesce(nullif(current_setting('atlas.origem', true), ''), 'ui');
  v_provider_message_id := nullif(current_setting('atlas.provider_message_id', true), '');
  if tg_op = 'INSERT' then
    v_from := null;
    v_to := 'Proposta cadastrada (' || new.etapa || ')';
  else
    if (to_jsonb(old) - array['updated_at','row_version']) = (to_jsonb(new) - array['updated_at','row_version']) then return new; end if;
    if new.etapa is distinct from old.etapa then
      v_from := old.etapa;
      v_to := old.etapa || ' → ' || new.etapa;
    else
      v_from := 'Valor líquido ' || to_char(old.valor_liquido, 'FM999G999G990D00');
      v_to := 'Valor líquido ' || to_char(new.valor_liquido, 'FM999G999G990D00');
    end if;
  end if;
  insert into public.historico_propostas(owner_id, proposta_id, versao, de, para, origem, provider_message_id, ator)
  values (new.owner_id, new.proposta_id, new.versao, v_from, v_to, v_origin, v_provider_message_id, auth.uid());
  return new;
end;
$$;
revoke all on function private.audit_proposal_change() from public, anon, authenticated;
create trigger propostas_audit after insert or update on public.propostas for each row execute function private.audit_proposal_change();

create or replace function public.registrar_ganho(p_proposta_id text, p_versao integer, p_processamento_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_claims jsonb := auth.jwt(); p public.propostas%rowtype; e public.email_processamentos%rowtype; recipient text;
begin
  if v_owner is null then raise exception 'Autenticação obrigatória'; end if;
  if not coalesce(v_claims -> 'app_metadata' -> 'atlas_roles', '[]'::jsonb) ? 'registrar_ganho' then
    raise exception 'Conta sem autorização para registrar ganho';
  end if;
  select * into p from public.propostas
   where owner_id = v_owner and proposta_id = p_proposta_id and versao = p_versao and vigente
   for update;
  if not found then raise exception 'Proposta vigente não encontrada'; end if;
  if p.etapa = 'Ganho' then return jsonb_build_object('resultado','sem_efeitos','motivo','já registrada'); end if;
  select * into e from public.email_processamentos where owner_id = v_owner and id = p_processamento_id for update;
  if not found or e.estado <> 'validado' or e.decisao <> 'aceite_inequivoco' or e.provider_message_id is null
    or e.codigo_extraido <> p.proposta_id or e.versao_extraida <> p.versao then
    raise exception 'Processamento de aceite validado não encontrado para esta proposta e versão';
  end if;
  if p.etapa not in ('Proposta','Negociacao') then raise exception 'Etapa inelegível para ganho'; end if;
  if p.validade is null or p.validade < timezone('America/Sao_Paulo', now())::date then raise exception 'Validade ausente ou expirada'; end if;
  if p.valor_liquido <= 0 or p.margem_pct < 0.25 then raise exception 'Revisão comercial: margem mínima de 25%% não atendida'; end if;
  if p.desconto_pct > 0.15 then raise exception 'Desconto acima de 15%% exige revisão específica de diretoria'; end if;
  if p.desconto_pct > 0.05 and not exists (
    select 1 from public.aprovacoes a where a.owner_id = v_owner and a.limite_desconto >= p.desconto_pct
      and (a.proposta_id = p.proposta_id or a.lote = 'LOTE_INICIAL') and (a.versao is null or a.versao = p.versao)
  ) then raise exception 'Aprovação protegida não encontrada para este desconto'; end if;
  select c.email_aceite into recipient from public.clientes c where c.owner_id = v_owner and c.cliente_id = p.cliente_id;
  perform set_config('atlas.origem', 'email', true);
  perform set_config('atlas.provider_message_id', e.provider_message_id, true);
  update public.propostas set etapa = 'Ganho', data_fechamento = timezone('America/Sao_Paulo', now())::date, row_version = row_version + 1
   where owner_id = v_owner and proposta_id = p_proposta_id and versao = p_versao;
  update public.email_processamentos set estado = 'registrado' where owner_id = v_owner and id = e.id;
  insert into public.email_outbox(owner_id, proposta_id, versao, processamento_id, destinatario_validado, assunto, corpo, estado)
  values (v_owner, p.proposta_id, p.versao, e.id, nullif(recipient,''), '[Atlas] Aceite registrado: ' || p.proposta_id || ' v' || p.versao,
    'Registramos o aceite da proposta ' || p.proposta_id || ', versão ' || p.versao || ', no valor de R$ ' || replace(p.valor_liquido::text, '.', ',') || '. Para organizar o alinhamento inicial, informe o contato de implantação e duas opções de horário. A equipe Atlas validará a agenda e retornará com a confirmação.',
    case when nullif(recipient,'') is null then 'aguardando_destinatario' else 'pendente' end);
  return jsonb_build_object('resultado','ganho_registrado','email_enviado',false);
end;
$$;
revoke all on function public.registrar_ganho(text, integer, uuid) from public, anon;
grant execute on function public.registrar_ganho(text, integer, uuid) to authenticated;

create or replace function public.reemitir_proposta(p_proposta_id text, p_versao integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); p public.propostas%rowtype; v_new_version integer;
begin
  if v_owner is null then raise exception 'Autenticação obrigatória'; end if;
  select * into p from public.propostas
   where owner_id = v_owner and proposta_id = p_proposta_id and versao = p_versao and vigente
   for update;
  if not found then raise exception 'Versão vigente não encontrada'; end if;
  if p.etapa in ('Ganho','Perdido') then raise exception 'Somente propostas abertas podem ser reemitidas'; end if;
  v_new_version := p.versao + 1;
  update public.propostas set vigente = false, row_version = row_version + 1
   where owner_id = v_owner and proposta_id = p_proposta_id and versao = p_versao;
  insert into public.propostas(owner_id, proposta_id, versao, vigente, cliente_id, vendedor_id, produto_id, regiao, canal,
    data_criacao, data_fechamento, validade, etapa, quantidade, preco_unitario, desconto_pct, custo_total,
    aprovacao_desconto, probabilidade, condicao_pagamento, motivo_perda, proxima_acao, valor_bruto, valor_liquido,
    margem_pct, valor_ponderado, row_version)
  values (v_owner, p.proposta_id, v_new_version, true, p.cliente_id, p.vendedor_id, p.produto_id, p.regiao, p.canal,
    timezone('America/Sao_Paulo', now())::date, null, p.validade, p.etapa, p.quantidade, p.preco_unitario, p.desconto_pct,
    p.custo_total, p.aprovacao_desconto, p.probabilidade, p.condicao_pagamento, null, p.proxima_acao,
    p.valor_bruto, p.valor_liquido, p.margem_pct, p.valor_ponderado, 1);
  return v_new_version;
end;
$$;
revoke all on function public.reemitir_proposta(text, integer) from public, anon;
grant execute on function public.reemitir_proposta(text, integer) to authenticated;
