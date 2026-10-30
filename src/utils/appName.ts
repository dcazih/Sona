import { version } from '@/../package.json'

export const appName = 'Sona'
export const appRepositoryUrl = 'https://github.com/dcazih/Sona'

export function getAppInfo() {
  return {
    name: appName,
    version,
    url: appRepositoryUrl,
    releaseUrl: appRepositoryUrl + '/releases/latest',
  }
}

export const lrclibClient = appName + ' v' + version + ' (' + appRepositoryUrl + ')'
