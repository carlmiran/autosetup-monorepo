// AUTOSETUP — apps/core/web/src/app/admin/page.tsx
// Central AutoSetup — índice de todas as páginas e ferramentas que existem
// de verdade em src/app (Etapa 0.6 da auditoria de 14/10/2026). Protegida
// pelo Basic Auth do src/middleware.ts.
//
// Ao criar ou remover uma página, atualizar a lista abaixo — ela é escrita
// à mão, não descoberta em tempo de execução.

import { Logo } from "@/components/Logo";
import { BotaoCopiarLink } from "@/components/BotaoCopiarLink";

/** publico = abre sem senha; protegido = exige senha/credencial;
 * sem-interface = Worker sem página (só cron ou API de máquina). */
type Acesso = "publico" | "protegido" | "sem-interface";

interface Item {
  nome: string;
  href: string;
  descricao: string;
  acesso: Acesso;
  /** Ressalva que muda a decisão de mandar ou não pra cliente. */
  nota?: string;
}

interface Grupo {
  titulo: string;
  itens: Item[];
}

const GRUPOS: Grupo[] = [
  {
    titulo: "Comercial",
    itens: [
      { nome: "Página inicial", href: "/", descricao: "Vitrine do AutoSetup, leva direto pro diagnóstico gratuito.", acesso: "publico" },
      { nome: "Diagnóstico completo", href: "/diagnostico", descricao: "LENS: diagnóstico do negócio com IA, pesquisa de concorrentes e PDF.", acesso: "publico" },
      { nome: "Diagnóstico rápido", href: "/diagnostico/rapido", descricao: "Versão de 5 perguntas, mesmo motor e mesmo banco do completo.", acesso: "publico" },
      { nome: "Planos", href: "/planos", descricao: "Raio-X, Essencial e Completo com checkout pelo Mercado Pago.", acesso: "publico" },
      { nome: "Pagamento em processamento", href: "/planos/sucesso", descricao: "Tela de retorno depois do checkout do Mercado Pago.", acesso: "publico", nota: "Só faz sentido depois de um pagamento" },
      { nome: "Privacidade e termos", href: "/privacidade", descricao: "Política de privacidade e termos de uso (LGPD).", acesso: "publico" },
    ],
  },
  {
    titulo: "Indicadores / Radar",
    itens: [
      { nome: "Radar de oportunidades", href: "/radar", descricao: "Negócios reais perto de você, com análise comercial por IA.", acesso: "publico", nota: "Ferramenta do indicador, não do cliente" },
      { nome: "Manual do indicador", href: "/radar/manual", descricao: "Como prospectar com o Radar, script de abordagem e o que nunca prometer.", acesso: "publico" },
      { nome: "Termos de colaboração", href: "/radar/termos", descricao: "Indicação sem vínculo empregatício e como funciona a comissão hoje.", acesso: "publico" },
      { nome: "Meus clientes", href: "/radar/meus-clientes", descricao: "Lista e Kanban de clientes do indicador, follow-ups, parecer e próxima mensagem.", acesso: "publico", nota: "Dados atrás do código + PIN do indicador" },
      { nome: "Meu desempenho", href: "/radar/meu-desempenho", descricao: "Diagnósticos, vendas e comissão do indicador.", acesso: "publico", nota: "Dados atrás do código + PIN do indicador" },
      { nome: "Minha região", href: "/radar/minha-regiao", descricao: "Região (GPS ou endereço) que o Prospector vai varrer pro indicador.", acesso: "publico", nota: "Dados atrás do código + PIN do indicador" },
      { nome: "Conectar Mercado Pago", href: "/indicadores/entrar", descricao: "Liga a conta do Mercado Pago do indicador pra divisão de comissão.", acesso: "publico", nota: "Fluxo ainda não validado — não divulgar" },
      { nome: "Conta conectada", href: "/indicadores/conectado", descricao: "Confirmação depois de conectar o Mercado Pago.", acesso: "publico", nota: "Só faz sentido depois da conexão" },
    ],
  },
  {
    titulo: "Entrega",
    itens: [
      { nome: "Gerar post", href: "/entrega/gerar-post", descricao: "Gera a imagem de um post (gpt-image-1) a partir de tema e legenda.", acesso: "publico", nota: "Uso interno SEM senha e custa por geração — não mandar" },
    ],
  },
  {
    titulo: "Admin",
    itens: [
      { nome: "Central AutoSetup", href: "/admin", descricao: "Esta página: índice de tudo o que existe no sistema.", acesso: "protegido" },
      { nome: "Clientes", href: "/admin/clientes", descricao: "Diagnósticos e pagamentos recentes, com exportação CSV.", acesso: "protegido" },
      { nome: "Comissões", href: "/admin/comissoes", descricao: "Comissão de 20% por venda indicada, marcar como paga e exportar CSV.", acesso: "protegido" },
      { nome: "Avisos", href: "/admin/avisos", descricao: "Publica o aviso que aparece pra todos os indicadores.", acesso: "protegido" },
    ],
  },
  {
    titulo: "RH",
    itens: [
      { nome: "Entrevista de RH", href: "/rh/entrevista", descricao: "Entrevista com especialista de RH pra construir o AutoSetup RH.", acesso: "publico", nota: "Pesquisa interna de produto" },
    ],
  },
  {
    titulo: "Connector",
    itens: [
      { nome: "Gerar código de pareamento", href: "/admin/connector", descricao: "Cria property_id + código de pareamento por unidade do cliente.", acesso: "protegido", nota: "Senha do admin + CONNECTOR_ADMIN_SECRET" },
      { nome: "Instalador do Connector", href: "/downloads/AutoSetupConnector-Setup-1.0.0.exe", descricao: "Instalador Windows do agente (servido do R2).", acesso: "publico", nota: "Pode mandar junto com o código de pareamento" },
    ],
  },
  {
    titulo: "Workers",
    itens: [
      { nome: "worker-connector", href: "https://autosetup-worker-connector.teodoromiranda.workers.dev", descricao: "Backend do agente: parear, sincronizar planilhas e revogar (fila + R2).", acesso: "sem-interface", nota: "API do agente — a raiz responde 404" },
      { nome: "worker-prospector", href: "https://autosetup-worker-prospector.teodoromiranda.workers.dev", descricao: "Prospecção diária por região do indicador (cron).", acesso: "sem-interface", nota: "Dormente: sem cron e sem secrets" },
      { nome: "worker-licitacoes", href: "https://autosetup-worker-licitacoes.teodoromiranda.workers.dev", descricao: "Radar de licitações do PNCP por perfil de cliente (cron).", acesso: "sem-interface", nota: "Dormente: sem cron e sem secrets" },
    ],
  },
];

const SELO: Record<Acesso, { texto: string; classe: string }> = {
  publico: { texto: "público", classe: "border-mint/40 bg-mint-dim text-mint" },
  protegido: { texto: "protegido", classe: "border-amber/40 bg-amber-dim/30 text-amber" },
  "sem-interface": { texto: "sem interface", classe: "border-panel-line bg-ink text-paper-dim" },
};

function Selo({ acesso }: { acesso: Acesso }) {
  const { texto, classe } = SELO[acesso];
  return (
    <span className={`shrink-0 font-mono text-[10px] uppercase tracking-widest border rounded px-1.5 py-0.5 ${classe}`}>
      {texto}
    </span>
  );
}

function CardItem({ item }: { item: Item }) {
  return (
    <li className="flex flex-col gap-3 border border-panel-line bg-panel rounded-lg p-4 hover:border-amber-dim transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-sm text-paper leading-snug">{item.nome}</h3>
        <Selo acesso={item.acesso} />
      </div>
      <p className="font-mono text-[11px] text-amber-dim break-all">{item.href}</p>
      <p className="text-sm text-paper-dim leading-relaxed flex-1">{item.descricao}</p>
      {item.nota && (
        <p className="text-xs text-rust border-l-2 border-rust-dim pl-2">{item.nota}</p>
      )}
      <div className="flex gap-2">
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center font-mono text-xs bg-amber text-ink font-semibold rounded-md px-3 py-2 hover:brightness-110 transition-all"
        >
          Abrir ↗
        </a>
        <BotaoCopiarLink href={item.href} />
      </div>
    </li>
  );
}

export default function CentralAutoSetupPage() {
  const total = GRUPOS.reduce((soma, g) => soma + g.itens.length, 0);
  const publicos = GRUPOS.flatMap((g) => g.itens).filter((i) => i.acesso === "publico" && !i.nota).length;

  return (
    <>
      <header className="border-b border-panel-line px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-amber">Painel interno</p>
              <h1 className="font-display text-xl text-paper">Central AutoSetup</h1>
            </div>
          </div>
          <dl className="flex gap-6 font-mono text-xs">
            <div>
              <dt className="text-paper-dim">itens</dt>
              <dd className="text-paper text-lg">{total}</dd>
            </div>
            <div>
              <dt className="text-paper-dim">grupos</dt>
              <dd className="text-paper text-lg">{GRUPOS.length}</dd>
            </div>
            <div>
              <dt className="text-paper-dim">livres pra cliente</dt>
              <dd className="text-mint text-lg">{publicos}</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 flex flex-col gap-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-paper-dim">
          <span className="flex items-center gap-2"><Selo acesso="publico" /> abre sem senha</span>
          <span className="flex items-center gap-2"><Selo acesso="protegido" /> exige a senha do admin</span>
          <span className="flex items-center gap-2"><Selo acesso="sem-interface" /> Worker sem página</span>
          <span>Linha vermelha = ressalva antes de mandar pra alguém.</span>
        </div>

        {GRUPOS.map((grupo) => (
          <section key={grupo.titulo} className="flex flex-col gap-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-amber flex items-center gap-3">
              {grupo.titulo}
              <span className="text-paper-dim">[{grupo.itens.length}]</span>
              <span className="h-px flex-1 bg-panel-line" />
            </h2>
            <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.itens.map((item) => (
                <CardItem key={item.href} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
