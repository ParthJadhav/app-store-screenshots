# Plano de Refatoração: Screenshots Mobile → Desktop Web App

## Contexto

Este repositório é uma **skill do Claude Code** que gera projetos Next.js para criação de screenshots promocionais. Atualmente o foco primário é iPhone/App Store, com suporte opcional a iPad e desktop. O objetivo é **inverter essa prioridade**: desktop web app como foco principal, mantendo mobile como opcional.

O código gerado reside inteiramente em `skills/app-store-screenshots/SKILL.md` (625 linhas de instruções) + `mockup.png`. A refatoração envolve modificar o SKILL.md para que os projetos gerados priorizem layouts desktop.

---

## 1. Arquitetura Alvo

```
skills/desktop-web-screenshots/
├── SKILL.md                    # Instruções refatoradas (desktop-first)
└── mockup.png                  # Mantido para suporte mobile opcional

Projeto gerado (pelo skill):
project/
├── public/
│   ├── mockup.png              # Apenas se mobile habilitado
│   ├── app-icon.png            # Ícone do web app
│   └── screenshots/            # Screenshots do web app (desktop)
│       ├── dashboard.png
│       ├── feature-1.png
│       └── ...
├── src/app/
│   ├── layout.tsx              # Setup de fontes
│   └── page.tsx                # Gerador (single file)
└── package.json
```

**Mudanças arquiteturais chave:**

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Device padrão | `"iphone"` | `"desktop"` |
| Canvas base | 1320×2868 (portrait) | 1920×1080 (landscape) |
| Mockup principal | Phone (PNG) | BrowserWindow (CSS) |
| Orientação | Portrait-first | Landscape-first |
| Dispositivos | iPhone + iPad (opcional) + Desktop (opcional) | Desktop + Browser + Hero section + Mobile (opcional) |

**Novos presets de tamanho:**

```typescript
const DESKTOP_SIZES = [
  { label: "Full HD", w: 1920, h: 1080 },      // Base de design
  { label: "HD", w: 1600, h: 900 },
  { label: "Ultra Wide", w: 2560, h: 1080 },
  { label: "5:4", w: 1440, h: 1024 },
] as const;

const HERO_SIZES = [
  { label: "Hero Wide", w: 1920, h: 800 },      // Para landing pages
  { label: "Hero Standard", w: 1440, h: 600 },
  { label: "OG Image", w: 1200, h: 630 },       // Open Graph / social
] as const;
```

---

## 2. Componentes Novos a Criar

### 2.1 `BrowserWindow` (aprimorado)
- **Já existe** no SKILL.md, mas precisa ser expandido
- Adicionar: URL bar customizável, temas claro/escuro, tabs com nomes
- Adicionar prop `url` para mostrar domínio real do usuário
- Adicionar prop `theme: "light" | "dark"` para chrome do browser

### 2.2 `DashboardFrame`
- Novo componente para screenshots de dashboards/painéis
- Sidebar + top navigation bar + área de conteúdo
- Prop `sidebarItems` para menu lateral customizável
- Prop `navTitle` para título na barra superior

### 2.3 `HeroSection`
- Componente para hero sections promocionais (landing pages)
- Layout horizontal: headline à esquerda + screenshot à direita
- Variação: screenshot centralizado com headline sobreposta
- Suporte a badges ("New", "Beta", "v2.0")
- Fundo com gradientes e elementos decorativos

### 2.4 `DesktopCaption`
- Variação do `Caption` existente otimizada para landscape
- Headlines mais curtas (1-2 linhas em vez de 3-4)
- Suporte a subtítulo/descrição mais longa abaixo
- Posicionamento: topo-esquerda, topo-centro, ou overlay

### 2.5 `FeatureCard`
- Card flutuante para destacar features específicas
- Ícone + título + descrição curta
- Usado como overlay em screenshots ou em grids

### 2.6 `ComparisonLayout`
- Dois `BrowserWindow` lado a lado (antes/depois)
- Ou versão animada com slider (para preview, export estático)

---

## 3. Componentes Antigos que Podem Ser Reaproveitados

| Componente | Reuso | Adaptação Necessária |
|-----------|-------|---------------------|
| **`BrowserWindow`** | 100% - já é CSS-only desktop | Apenas expandir com props extras (url, theme, tabs) |
| **`Caption`** | 90% - escala por `canvasW` | Ajustar proporções para landscape (fontes menores relativas) |
| **`Phone`** | 100% como está | Mover para seção "opcional/mobile" |
| **`IPad`** | 100% como está | Mover para seção "opcional/mobile" |
| **`ScreenshotPreview`** | 95% | Ajustar aspect ratio do grid card para landscape |
| **`ScreenshotsPage`** | 90% | Trocar device padrão, renomear toggle, adicionar novos presets |
| **Lógica de export** | 100% | Zero alterações - `toPng()` é agnóstico a dimensões |
| **Decorativos (blobs, glows)** | 80% | Reposicionar para composição horizontal |
| **ResizeObserver scaling** | 100% | Sem alterações |
| **Estrutura de SIZES/SCREENSHOTS** | 95% | Expandir registries, manter padrão |

**Total estimado: ~85% do código é reutilizável.**

---

## 4. Arquivos que Precisam Ser Alterados

### 4.1 `skills/app-store-screenshots/SKILL.md` (arquivo principal)

| Seção | Alteração | Risco |
|-------|-----------|-------|
| **Título & Overview** (L1-10) | Renomear para "Web App Screenshots Generator" | Baixo |
| **Step 1: Perguntas** (L18-47) | Trocar perguntas iPhone-first por desktop-first | Médio |
| **Step 2: Setup** (L49-107) | Mudar file structure (screenshots/ → desktop-first) | Baixo |
| **Step 3: Slides** (L162-180) | Adaptar framework narrativo para web apps | Médio |
| **Step 4: Copy** (L182-256) | Exemplos de copy para SaaS/web apps | Baixo |
| **Step 5: Build** (L263-505) | Refatoração principal - novos componentes, layouts landscape | Alto |
| **Step 5: Constantes** (L282-353) | Desktop como default, mobile como opcional | Médio |
| **Step 5: Typography** (L506-515) | Ajustar escalas para canvas landscape | Médio |
| **Step 5: Patterns** (L517-537) | Novos patterns de posicionamento (landscape) | Alto |
| **Step 6: Export** (L542-580) | Novos presets de tamanho, filenames desktop-first | Baixo |
| **Step 7: QA Gate** (L582-624) | Checklist adaptado para desktop | Baixo |

### 4.2 `README.md`
- Atualizar descrição, exemplos e screenshots

### 4.3 `mockup.png`
- **Manter** (para suporte mobile opcional)
- Considerar adicionar um `browser-mockup.png` de referência (opcional - browser é CSS)

### 4.4 Metadados do skill (frontmatter L1-4)
- Renomear name/description para refletir foco desktop

---

## 5. Estratégia de Migração com Menor Risco

### Princípio: Expansão antes de Substituição

Em vez de remover código mobile e substituir por desktop, a estratégia é:

1. **Adicionar** suporte desktop completo como primeira classe
2. **Inverter** a ordem de prioridade (desktop default)
3. **Mover** conteúdo mobile para seção "opcional"
4. **Nunca deletar** componentes existentes

### Fases de Migração

```
Fase 1: Expansão (sem breaking changes)
├── Adicionar novos componentes desktop ao SKILL.md
├── Expandir presets de tamanho
├── Adicionar layout patterns para landscape
└── Manter tudo mobile intacto

Fase 2: Inversão de Prioridade (reorganização)
├── Trocar device default de "iphone" para "desktop"
├── Reorganizar Step 1 (perguntas desktop-first)
├── Reordenar Step 5 (desktop antes de mobile)
└── Ajustar file structure sugerida

Fase 3: Especialização (novos layouts)
├── DashboardFrame
├── HeroSection
├── ComparisonLayout
├── Landing page patterns
└── Adaptar framework narrativo

Fase 4: Polish (refinamento)
├── Exemplos de copy para SaaS
├── QA Gate atualizado
├── README atualizado
└── Testes manuais de geração
```

---

## 6. Ordem Ideal de Implementação

### Fase 1 — Fundação Desktop (Menor risco, maior reuso)
1. **Expandir constantes** — Adicionar `DESKTOP_SIZES` e `HERO_SIZES` como presets primários
2. **Aprimorar `BrowserWindow`** — Props `url`, `theme`, `tabs`
3. **Criar `DesktopCaption`** — Variação landscape do Caption
4. **Adicionar patterns de layout landscape** — Posicionamento horizontal

### Fase 2 — Inversão de Prioridade
5. **Reorganizar Step 1** — Perguntas desktop-first, mobile como opcional
6. **Atualizar Step 2** — File structure desktop-first
7. **Trocar defaults** — `device: "desktop"`, canvas base 1920×1080
8. **Reordenar Architecture** — Desktop primeiro na documentação

### Fase 3 — Layouts Especializados
9. **Criar `HeroSection`** — Layout hero para landing pages
10. **Criar `DashboardFrame`** — Frame de dashboard com sidebar
11. **Criar `ComparisonLayout`** — Antes/depois lado a lado
12. **Criar `FeatureCard`** — Cards flutuantes para features

### Fase 4 — Conteúdo & Polish
13. **Adaptar framework narrativo** — Narrativa SaaS/web app
14. **Novos exemplos de copy** — Headlines para produtos web
15. **Atualizar QA Gate** — Checklist desktop
16. **Atualizar README** — Descrição, exemplos, screenshot de referência
17. **Atualizar metadados** — frontmatter do SKILL.md

---

## 7. Riscos de Quebrar Funcionalidades Existentes

### Risco Alto

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Escala tipográfica quebrada em landscape | Headlines gigantes ou ilegíveis em 1920×1080 | Testar fórmulas `W * 0.028` com W=1920 antes de commitar. Para landscape, usar `W * 0.018` a `W * 0.06` |
| Layouts portrait usados em canvas landscape | Elementos empilhados com espaço vazio lateral | Criar patterns dedicados para landscape; nunca reaproveitar posicionamento portrait diretamente |

### Risco Médio

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Export breaks com novos tamanhos | PNGs em branco ou cortados | Manter lógica de `toPng()` intacta — já é agnóstica a dimensões. Testar com 1920×1080 |
| Framework narrativo não faz sentido para web | Slides com arco de "App Store" em contexto desktop | Adaptar slots: Hero → Feature Demo → Integration → Pricing → Trust |
| `ResizeObserver` scaling com aspect ratio invertido | Preview cards distorcidas | Ajustar grid para cards landscape (16:9 em vez de 9:19.5) |
| Renomear skill quebra referências externas | Usuários com skill antigo perdem acesso | Manter alias no nome ou manter ambos os nomes no trigger do frontmatter |

### Risco Baixo

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Mobile mockup orphan | mockup.png sem uso em projetos desktop-only | Manter como opcional, sem impacto |
| File structure diferente | Confusão em projetos existentes | Projetos são gerados do zero, não há migração de existentes |
| Copy examples desalinhados | Headlines mobile em contexto desktop | Substituir todos os exemplos na Fase 4 |

### O que NÃO vai quebrar
- **Lógica de export** (`toPng` + double-call trick) — agnóstica a device/dimensão
- **Font setup** (`layout.tsx`) — independente de device
- **ResizeObserver** — calcula scale ratio, funciona com qualquer dimensão
- **CSS-only components** (iPad, Browser) — flexíveis por natureza
- **Registries pattern** (SCREENSHOTS arrays) — apenas precisa adicionar, não alterar

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Código reutilizável | ~85% |
| Arquivos a alterar | 3 (SKILL.md, README.md, frontmatter) |
| Componentes novos | 5 (DashboardFrame, HeroSection, DesktopCaption, FeatureCard, ComparisonLayout) |
| Componentes reaproveitados | 8 (BrowserWindow, Caption, Phone, IPad, ScreenshotPreview, ScreenshotsPage, Export logic, Decorativos) |
| Fases de implementação | 4 |
| Steps de implementação | 17 |
| Risco geral | Baixo-Médio (nenhuma lógica core precisa ser reescrita) |

A chave desta refatoração é que o `SKILL.md` é um documento de **instruções**, não código compilado. Isso significa que mudanças são aditivas por natureza — podemos expandir sem risco de regredir funcionalidade existente, desde que a seção mobile seja preservada como opcional.
