import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Code2,
  Globe,
  MessageCircle,
  Plug,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DocCodeBlock } from '@/components/admin/doc-code-block'
import { PageHeader } from '@/components/page-parts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/** Публичный домен панели — сниппеты и эндпоинты подставляются автоматически. */
const PANEL_DOMAIN = 'charter-panel.com'
const PANEL_URL = `https://${PANEL_DOMAIN}`

export const metadata = {
  title: 'Документация — Charter Panel',
  description:
    'Как установить, настроить и использовать виджет онлайн-чата Charter Panel.',
}

function Section({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string
  icon: typeof BookOpen
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card id={id} className="scroll-mt-6 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </Card>
  )
}

function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <span className="w-44 shrink-0 font-mono text-[13px] text-foreground">
        {name}
      </span>
      <span className="text-sm text-muted-foreground">{children}</span>
    </div>
  )
}

function StatusPill({
  tone,
  label,
}: {
  tone: 'amber' | 'emerald' | 'muted' | 'red'
  label: string
}) {
  const styles: Record<typeof tone, string> = {
    amber: 'border-amber-500/30 text-amber-600 dark:text-amber-400',
    emerald: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    muted: 'border-border text-muted-foreground',
    red: 'border-destructive/30 text-destructive',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs font-medium ${styles[tone]}`}
    >
      {label}
    </span>
  )
}

const TOC = [
  { href: '#overview', label: 'Обзор' },
  { href: '#quick-start', label: 'Быстрый старт' },
  { href: '#appearance', label: 'Внешний вид' },
  { href: '#status', label: 'Жизненный цикл статуса' },
  { href: '#queue', label: 'Очередь менеджеров' },
  { href: '#api', label: 'JavaScript API и события' },
  { href: '#security', label: 'Origin и безопасность' },
  { href: '#endpoints', label: 'Справочник эндпоинтов' },
  { href: '#troubleshooting', label: 'Решение проблем' },
]

export default function AdminDocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Документация"
        description="Всё, что нужно, чтобы установить, настроить и запустить виджет онлайн-чата Charter Panel на вашем сайте."
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/admin/livechat" />}
          >
            <ArrowLeft className="size-4" />
            <span>К онлайн-чату</span>
          </Button>
        }
      />

      {/* Навигация по странице */}
      <Card className="p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          На этой странице
        </p>
        <nav className="flex flex-wrap gap-2">
          {TOC.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </Card>

      <Section
        id="overview"
        icon={BookOpen}
        title="Обзор"
        description="Что такое виджет онлайн-чата и как всё устроено."
      >
        <p>
          Виджет онлайн-чата Charter Panel — это один лёгкий скрипт, который вы
          вставляете на любой сайт. Он отрисовывает плавающую кнопку и панель
          чата прямо на странице (без iframe) и в реальном времени соединяет
          посетителей с очередью ваших менеджеров. Сообщения посетителей
          попадают во входящие менеджера, а ответы мгновенно возвращаются
          посетителю.
        </p>
        <p>
          Каждая интеграция — это один <strong>канал</strong>, привязанный к
          одному публичному API-ключу и одному домену сайта. Виджет общается с
          двумя эндпоинтами на{' '}
          <span className="font-mono text-foreground">{PANEL_DOMAIN}</span>:
          входящий эндпоинт для сообщений посетителей и поток Server-Sent Events
          для ответов и истории.
        </p>
      </Section>

      <Section
        id="quick-start"
        icon={Plug}
        title="Быстрый старт"
        description="Создайте виджет и установите его в три шага."
      >
        <ol className="ml-4 list-decimal space-y-2 marker:text-muted-foreground">
          <li>
            Перейдите в <strong>Онлайн-чат</strong> в боковом меню и нажмите{' '}
            <strong>Добавить онлайн-чат</strong>.
          </li>
          <li>
            Укажите <strong>домен сайта</strong> и выберите хотя бы одного{' '}
            <strong>менеджера</strong> для очереди, затем сохраните.
          </li>
          <li>
            Скопируйте сниппет из диалога и вставьте его перед закрывающим тегом{' '}
            <span className="font-mono">{'</body>'}</span> на вашем сайте.
          </li>
        </ol>
        <p>Сниппет выглядит так:</p>
        <DocCodeBlock
          language="html"
          code={`<script async src="${PANEL_URL}/livechat.js"
  data-omnidesk-key="lc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  data-omnidesk-title="Чат поддержки"
  data-omnidesk-color="#2563eb"
  data-omnidesk-greeting="Здравствуйте! Чем помочь?"></script>`}
        />
        <p className="text-muted-foreground">
          Обязателен только <span className="font-mono">data-omnidesk-key</span>.
          Заголовок, цвет и приветствие подставляются автоматически, когда вы
          настраиваете внешний вид. Необязательные параметры:{' '}
          <span className="font-mono">data-omnidesk-name</span> и{' '}
          <span className="font-mono">data-omnidesk-subject</span>.
        </p>
      </Section>

      <Section
        id="appearance"
        icon={MessageCircle}
        title="Внешний вид"
        description="Настройте, как выглядят кнопка и панель."
      >
        <p>
          На карточке каждого онлайн-чата откройте иконку кисти, чтобы изменить
          внешний вид виджета. Настройки зашиваются в сниппет как атрибуты{' '}
          <span className="font-mono">data-omnidesk-*</span>.
        </p>
        <div className="rounded-lg border border-border p-3">
          <Field name="data-omnidesk-title">Заголовок панели чата.</Field>
          <Field name="data-omnidesk-color">
            Фирменный цвет (hex, например{' '}
            <span className="font-mono">#2563eb</span>) для кнопки, шапки и
            исходящих сообщений.
          </Field>
          <Field name="data-omnidesk-greeting">
            Необязательное приветственное облачко над кнопкой.
          </Field>
        </div>
      </Section>

      <Section
        id="status"
        icon={Radio}
        title="Жизненный цикл статуса"
        description="channels.status — единственный источник правды о состоянии интеграции."
      >
        <p>
          Админка отражает <strong>реальное</strong> состояние интеграции, а не
          значение по умолчанию. Только что созданный виджет имеет статус{' '}
          <StatusPill tone="amber" label="pending" /> и отображается как{' '}
          <strong>Не интегрирован</strong>, пока скрипт фактически не подключится
          с вашего живого сайта. Первое успешное рукопожатие переводит его в{' '}
          <StatusPill tone="emerald" label="connected" />, что показывается как{' '}
          <strong>Активен</strong>.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <div className="mb-1.5">
              <StatusPill tone="amber" label="pending" />
            </div>
            <p className="text-sm text-muted-foreground">
              Создан в админке. Виджет ещё ни разу не подключался с сайта.
              Отображается как <strong>Не интегрирован</strong>.
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="mb-1.5">
              <StatusPill tone="emerald" label="connected" />
            </div>
            <p className="text-sm text-muted-foreground">
              Виджет выполнил рукопожатие с разрешённого origin. Отображается как{' '}
              <strong>Активен</strong>. Именно это вы видите на{' '}
              <span className="font-mono">/admin/livechat</span> и{' '}
              <span className="font-mono">/admin/channels</span>.
            </p>
          </div>
        </div>
        <p className="text-muted-foreground">
          Переход происходит автоматически: когда виджет открывает поток событий
          с установленной страницы, панель помечает канал подключённым. Никаких
          ручных действий не требуется.
        </p>
      </Section>

      <Section
        id="queue"
        icon={Users}
        title="Очередь менеджеров и доступность"
        description="Как распределяются посетители и что будет без менеджеров."
      >
        <p>
          У каждого канала есть упорядоченная <strong>очередь менеджеров</strong>
          . Новые посетители распределяются по очереди по принципу round-robin;
          порядок выбора — это порядок ротации. Как только посетителю назначен
          менеджер, все его последующие сообщения остаются за тем же менеджером.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-3.5">
          <p className="font-medium text-foreground">Чат всегда доступен</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Удаление менеджеров никогда не удаляет чат. Канал и его API-ключ
            остаются нетронутыми. Если убрать всех менеджеров, виджет остаётся на
            сайте и показывает посетителю вежливое уведомление вместо ошибки:
          </p>
          <p className="mt-2 rounded-md border border-border bg-background px-3 py-2 text-sm italic text-foreground">
            «К сожалению, сейчас мы не можем ответить. Оставьте сообщение — мы
            свяжемся с вами, как только освободимся.»
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Назначьте менеджера в очередь снова — маршрутизация возобновится
            мгновенно.
          </p>
        </div>
      </Section>

      <Section
        id="api"
        icon={Code2}
        title="JavaScript API и события"
        description="Открывайте виджет программно и подключайтесь к аналитике."
      >
        <p>
          Глобальный объект —{' '}
          <span className="font-mono">window.OmnideskLiveChat</span>. Вы можете
          открывать и закрывать виджет, предзаполнять данные посетителя и
          подписываться на события — даже до загрузки скрипта (подписки
          ставятся в очередь).
        </p>
        <DocCodeBlock
          language="javascript"
          code={`// Открыть + предзаполнить (ничего не делает, пока виджет не подтверждён)
OmnideskLiveChat.open({
  name: 'Иван Петров',
  subject: 'Вакансия: Курьер',
  message: 'Здравствуйте, хочу откликнуться...'
})

OmnideskLiveChat.close()`}
        />
        <p>События (безопасно подписываться из head страницы):</p>
        <DocCodeBlock
          language="javascript"
          code={`OmnideskLiveChat.on('open',          () => {})
OmnideskLiveChat.on('close',         () => {})
OmnideskLiveChat.on('message_sent',  ({ body, count }) => {})
OmnideskLiveChat.on('first_message', ({ body }) => {})`}
        />
        <p>Пример: своя кнопка плюс цели Яндекс.Метрики:</p>
        <DocCodeBlock
          language="html"
          code={`<script>
  OmnideskLiveChat.on('open',          () => ym(XXXXXX, 'reachGoal', 'chat_open'))
  OmnideskLiveChat.on('first_message', () => ym(XXXXXX, 'reachGoal', 'chat_first_message'))
</script>

<button onclick="OmnideskLiveChat.open({ subject: 'Вакансия: ' + position })">
  Откликнуться
</button>`}
        />
      </Section>

      <Section
        id="security"
        icon={ShieldCheck}
        title="Origin и безопасность"
        description="Как запросы аутентифицируются и ограничиваются."
      >
        <p>
          Оба эндпоинта аутентифицируются по <strong>API-ключу</strong> канала и
          заголовку <strong>Origin</strong> запроса — без cookie сессии, потому
          что виджет работает кросс-доменно на вашем сайте.
        </p>
        <ul className="ml-4 list-disc space-y-1.5 marker:text-muted-foreground">
          <li>
            Если на канале <strong>задан домен</strong>, Origin запроса должен
            совпадать с ним или быть его поддоменом.
          </li>
          <li>
            Если <strong>домен пуст</strong>, разрешены любые origin (удобно для
            стейджинга или мульти-доменных сценариев).
          </li>
          <li>
            API-ключ — это публичный идентификатор канала, а не секрет; его
            единственная возможность — писать в этот канал с разрешённого origin.
            Держите список разрешённых origin строгим.
          </li>
          <li>
            IP посетителя фиксируется на сервере из заголовков прокси и никогда
            не берётся на доверие с клиента.
          </li>
        </ul>
      </Section>

      <Section
        id="endpoints"
        icon={Globe}
        title="Справочник эндпоинтов"
        description={`Все обслуживаются с ${PANEL_DOMAIN}.`}
      >
        <div className="rounded-lg border border-border p-3">
          <Field name="GET /livechat.js">
            Встраиваемый скрипт виджета (монтируется из сниппета автоматически).
          </Field>
          <Field name="POST /api/livechat/ingest">
            Посетитель → панель: отправляет сообщение. Возвращает{' '}
            <span className="font-mono">{'{ ok, noAgents? }'}</span>.
          </Field>
          <Field name="GET /api/livechat/stream">
            Server-Sent Events: повтор истории + живые ответы менеджеров. При
            рукопожатии помечает канал подключённым.
          </Field>
        </div>
        <DocCodeBlock
          language="text"
          code={`Скрипт виджета   ${PANEL_URL}/livechat.js
Входящие (POST)  ${PANEL_URL}/api/livechat/ingest
Поток (SSE)      ${PANEL_URL}/api/livechat/stream`}
        />
      </Section>

      <Section
        id="troubleshooting"
        icon={AlertTriangle}
        title="Решение проблем"
        description="Частые ситуации и что они означают."
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3">
            <p className="font-medium text-foreground">
              Карточка показывает «Не интегрирован» после установки сниппета
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Виджет должен один раз подключиться с живого сайта. Откройте
              страницу со сниппетом (с совпадающим доменом/origin) — статус
              автоматически сменится на <strong>Активен</strong>. Если он
              остаётся pending, проверьте домен/origin и что сниппет загружается
              (вкладка Network).
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="font-medium text-foreground">
              Посетители видят «сейчас мы не можем ответить»
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              На канале нет доступных менеджеров. Добавьте хотя бы одного
              менеджера в очередь — маршрутизация возобновится сразу. Сам чат
              никогда не удаляется.
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="font-medium text-foreground">
              Виджет вообще не появляется
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              API-ключ должен указывать на существующий канал, а origin запроса
              должен быть разрешён. Удалённый ключ или запрещённый origin означают,
              что кнопка не отрисуется.
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}
