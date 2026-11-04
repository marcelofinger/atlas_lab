# Atlas CRM — laboratório

Aplicação de propostas comerciais da Atlas Soluções Comerciais. A interface está em português, usa BRL e datas `dd/mm/aaaa`, e segue os tokens de marca fornecidos. A planilha tratada é usada apenas para a carga inicial; os dados de operação ficam no Supabase.

## Requisitos

- Node.js 20.9 ou superior.
- Projeto Supabase com Auth e Data API habilitados.
- Conta de usuário criada no Supabase Auth. Não há cadastro público no CRM.

## Executar localmente

```bash
npm ci
cp .env.example .env.local
```

Preencha `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do projeto Supabase. Em seguida, aplique a migração e inicie o app:

```bash
npm run db:link -- --project-ref SEU_PROJECT_REF
npm run db:push
npm run dev
```

Abra `http://localhost:3000`. Crie as contas pelo painel autorizado do Supabase. O login usa Auth SSR em cookies; tokens de sessão comerciais não são salvos em `localStorage`.

Sem o projeto Supabase, o app ainda compila e mostra a tela de login e o estado de configuração pendente, mas não aceita credenciais nem dados comerciais.

## Carga inicial

Use apenas `Atlas_CRM_Transferencia/dados/vendas_atlas_tratada.csv` e os CSVs em `dados/cadastros/`. O importador usa hash SHA-256 do lote, associa cada linha ao UUID do proprietário, evita sobrescrever códigos existentes e apresenta conflitos no resultado.

No ambiente seguro, preencha `SUPABASE_SECRET_KEY` e `ATLAS_IMPORT_OWNER_ID` localmente (não os publique nem os adicione ao `.env.example`) e rode:

```bash
npm run import:initial
```

O contato/e-mail de aceite da cópia está vazio. O importador não carrega as aprovações fictícias como autoridade protegida nem acessa a base bruta.

## Fluxos implementados

- Login por e-mail e senha do Supabase Auth.
- Dashboard com vendas por mês de fechamento, atingimento, taxa, ticket, margem ponderada e carteira aberta/ponderada. Novembro sem meta é mostrado sem percentual.
- Lista de propostas com busca por código, filtros por etapa/vendedor/região/canal/produto e paginação.
- Cadastro e edição com validação server-side e recálculo dos valores comerciais no banco.
- Detalhe e histórico auditável por proposta, com alertas de validade, alçada e margem.
- Isolamento por `owner_id` via RLS nas tabelas expostas.
- Ganho somente por `registrar_ganho`, que verifica papel em `app_metadata`, exige um processamento de e-mail previamente validado com aceite inequívoco, trava a proposta, valida etapa/validade/alçada/margem e grava ganho, histórico e outbox na mesma transação. O formulário e a interface não oferecem uma ação para registrar ganho nesta etapa.

A saída criada por um ganho fica `aguardando_destinatario` quando não existe contato autorizado ou `pendente` quando há destinatário validado. O envio e o processamento de e-mail não estão implementados. Alertas comerciais ficam visíveis e bloqueiam o ganho pela função.

## Segurança e configuração

- Use a chave publishable no cliente; nunca exponha a chave secret do Supabase.
- `registrar_ganho` depende de `app_metadata.atlas_roles` contendo `registrar_ganho`. Configure esse atributo somente por processo administrativo protegido; não use `user_metadata`.
- A tabela de aprovações não concede leitura ou gravação a `authenticated`. Os registros de aprovação não são inferidos de texto em proposta.
- Configure as variáveis locais na Vercel após confirmar projeto e time. Não copie tokens para o repositório.
- Gmail, rotinas automáticas, processamento de aceite e envio de respostas não estão conectados nesta etapa. Sem um registro de processamento validado por serviço autorizado, `registrar_ganho` recusa a chamada.

## Verificações

```bash
npm run lint
npm run typecheck
npm run build
```

Para validar o fluxo completo de autenticação, RLS, CRUD e persistência após recarregar, é necessário aplicar a migração em um projeto Supabase de laboratório e criar dois usuários de teste com proprietários distintos. A função de ganho deve ser verificada com um usuário sem papel, com papel autorizado, alertas, margem/alçada e repetição. Nenhum teste real de e-mail é executado.

## Vercel e GitHub

Conecte o repositório GitHub autorizado a um projeto Vercel de preview primeiro; informe as mesmas duas variáveis `NEXT_PUBLIC_SUPABASE_*` no ambiente de preview. Migrações devem ser aplicadas ao projeto Supabase alvo antes da primeira execução. Não promova a produção antes da revisão.
