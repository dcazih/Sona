import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2, Server } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { z } from 'zod'
import { queryServerInfo } from '@/api/queryServerInfo'
import { LangToggle } from '@/app/components/login/lang-toggle'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/app/components/ui/form'
import { Input } from '@/app/components/ui/input'
import { Password } from '@/app/components/ui/password'
import { ROUTES } from '@/routes/routesList'
import { useAppActions } from '@/store/app.store'
import { removeSlashFromUrl } from '@/utils/removeSlashFromUrl'

// Prefer the Navidrome endpoint supplied by the deployment, with the NAS music service as the fallback.
const DEFAULT_SERVER = window.SERVER_URL?.trim() || 'https://music.hippocampus-polaris.ts.net'
const loginSchema = z.object({
  url: z.string()
    .url({ message: 'login.form.validations.url' })
    .refine((value) => /^https?:\/\//.test(value), { message: 'login.form.validations.protocol' }),
  username: z.string().min(1, 'login.form.validations.username'),
  password: z.string().min(1, 'login.form.validations.password'),
})
type FormData = z.infer<typeof loginSchema>
const defaultServer = DEFAULT_SERVER

function normalizeServer(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return removeSlashFromUrl(/^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed)
}

function displayServer(value: string) {
  return value.replace(/^https?:\/\//i, '').replace(/\/+$/, '') || 'Choose a server'
}

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [serverOpen, setServerOpen] = useState(false)
  const [serverIsIncompatible, setServerIsIncompatible] = useState(false)
  const { saveConfig } = useAppActions()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { url: defaultServer, username: '', password: '' },
  })
  const currentServer = form.watch('url')

  async function onSubmit(data: FormData, forceCompatible?: boolean) {
    if (loading) return
    setLoading(true)
    try {
      const serverUrl = normalizeServer(data.url)
      const serverInfo = await queryServerInfo(serverUrl)
      if (serverInfo.protocolVersionNumber < 1150 && forceCompatible !== true) {
        setServerIsIncompatible(true)
        return
      }
      setServerIsIncompatible(false)
      const status = await saveConfig({ ...data, url: serverUrl })
      if (status) {
        await queryClient.invalidateQueries()
        toast.success(t('toast.server.success'))
        navigate(ROUTES.LIBRARY.HOME, { replace: true })
      } else {
        toast.error(t('toast.server.error'))
      }
    } catch {
      toast.error(t('toast.server.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="sona-login-card">
        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(
            (data) => onSubmit(data),
            (errors) => { if (errors.url) setServerOpen(true) },
          )}>
            <CardHeader className="sona-login-card-header">
              <div>
                <CardTitle>Sign in</CardTitle>
              </div>
              <div className="sona-login-language" aria-label="Language"><LangToggle /></div>
            </CardHeader>
            <CardContent className="sona-login-fields">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem className="sona-login-field">
                  <FormLabel className="sr-only">{t('login.form.username')}</FormLabel>
                  <div className="sona-login-input-wrap">
                    <FormControl>
                      <Input {...field} id="username" type="text" autoComplete="username" autoFocus={false}
                        placeholder="Username"
                        autoCorrect="off" autoCapitalize="none" spellCheck={false} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem className="sona-login-field">
                  <FormLabel className="sr-only">{t('login.form.password')}</FormLabel>
                  <div className="sona-login-input-wrap">
                    <FormControl>
                      <Password {...field} id="password" autoComplete="current-password" autoFocus={false}
                        placeholder="Password" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="url" render={({ field }) => (
                <FormItem className="sona-login-server-field">
                  <div className="sona-login-server">
                      <button type="button" className="sona-login-server-trigger"
                        aria-expanded={serverOpen}
                        aria-controls="sona-login-server-settings"
                        onClick={() => setServerOpen(open => !open)}
                        aria-label={'Server: ' + displayServer(currentServer) + '. Change server'}>
                        <span className="sona-login-server-indicator"><Server size={16} strokeWidth={1.8} /></span>
                        <span className="sona-login-server-name">
                          <span>Server:</span> <strong>{displayServer(currentServer)}</strong>
                        </span>
                        <ChevronDown className={'sona-login-server-chevron' + (serverOpen ? ' is-open' : '')}
                          size={18} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    <div id="sona-login-server-settings"
                      className={'sona-login-server-panel' + (serverOpen ? ' is-open' : '')}
                      aria-hidden={!serverOpen}>
                      <div className="sona-login-server-panel-inner">
                        <div className="sona-login-server-content">
                      <FormLabel>Server URL</FormLabel>
                      <FormControl>
                        <Input {...field} id="url" type="url" inputMode="url"
                          autoCorrect="off" autoCapitalize="none" spellCheck={false}
                          tabIndex={serverOpen ? 0 : -1}
                          placeholder={DEFAULT_SERVER}
                          onBlur={(event) => {
                            field.onBlur()
                            if (event.target.value.trim()) field.onChange(normalizeServer(event.target.value))
                          }} />
                      </FormControl>
                      <FormMessage />
                      <p className="sona-login-server-help">Enter a full HTTPS address. Your device must be able to reach the server.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </FormItem>
              )} />
            </CardContent>
            <CardFooter className="sona-login-submit-wrap">
              <Button type="submit" className="sona-login-submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={19} className="animate-spin" />{t('login.form.connecting')}</>
                  : <>{t('login.form.connect')} <span aria-hidden="true">→</span></>}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <Dialog open={serverIsIncompatible} onOpenChange={setServerIsIncompatible}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader><DialogTitle>{t('server.incompatible.title')}</DialogTitle></DialogHeader>
          <p>{t('server.incompatible.description')}</p>
          <DialogFooter>
            <Button onClick={form.handleSubmit((data) => onSubmit(data, true))}>
              {t('server.incompatible.skip')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
