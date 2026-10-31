import { ReactCountryFlag } from 'react-country-flag'
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/app/components/ui/select'
import { languages } from '@/i18n/languages'
import { useLang } from '@/store/lang.store'

const mainLanguageIds = ['en-US', 'es-ES', 'de']
const mainLanguages = mainLanguageIds.flatMap(id =>
  languages.filter(language => language.langCode === id))
const otherLanguages = languages.filter(language => !mainLanguageIds.includes(language.langCode))

export function LangToggle() {
  const { langCode, setLang, flag } = useLang()
  return (
    <Select value={langCode} onValueChange={setLang}>
      <SelectTrigger aria-label="Choose language"
        className="sona-login-language-trigger">
        <SelectValue>
          <ReactCountryFlag countryCode={flag} svg />
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" sideOffset={8} position="popper" collisionPadding={16}
        className="sona-login-language-popover">
        <SelectGroup>
          <SelectLabel className="sona-login-language-heading">Main Languages</SelectLabel>
          {mainLanguages.map(language => (
            <SelectItem className="sona-login-language-option"
              key={language.langCode} value={language.langCode}>
              <span className="sona-language-label"><ReactCountryFlag countryCode={language.flag} svg />
                <span>{language.nativeName}</span></span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator className="sona-login-language-divider" />
        <SelectGroup>
          <SelectLabel className="sona-login-language-heading">Other Languages</SelectLabel>
          {otherLanguages.map(language => (
            <SelectItem className="sona-login-language-option"
              key={language.langCode} value={language.langCode}>
              <span className="sona-language-label"><ReactCountryFlag countryCode={language.flag} svg />
                <span>{language.nativeName}</span></span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
