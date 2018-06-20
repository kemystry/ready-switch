import uaParser from 'ua-parser-js';
import lodashGet from 'lodash.get'
import Cookie from 'js-cookie';

const SEED_MAX = 10 * 1000;

const COOKIE_NAME = '__ready_seed';

const day = 1000 * 60 * 60 * 24;

const timeMap = {
  daily: day,
  weekly: day * 7,
  monthly: day * 30,
};

let conf = {};

export const init = () => fetch('http://ready-switch.s3-website-us-east-1.amazonaws.com/example.config.json')
    .then(r => r.json())
    .then(d => {
      conf = d;
      return d;
    })
    .catch(() => null);

const getSeed = () => {
  let seed = Cookie.get(COOKIE_NAME);
  if (!seed) {
    seed = Math.floor(Math.random() * SEED_MAX);
    Cookie.set(COOKIE_NAME, seed);
  }
  return seed;
}

const userSeed = getSeed();

const agent = uaParser(navigator.userAgent);

const findFlag = (flag) => {
  const [group, feature] = flag.split('.');
  return lodashGet(conf, `${group}.flags.${feature}`, false);
}


const matchesBrowser = (name, versionExpression) => {
  if (agent.browser.name.toLowerCase() !== name.toLowerCase()) return false;
  if (versionExpression === 'all') return true;
  const [, operator, eq, ver] = versionExpression.match(/(>|<|=)(=?)\s([0-9]+)/);
  const inclusive = eq === '=';
  const version = parseInt(ver, 10);
  const browserMajor = parseInt(agent.browser.major, 10);
  switch (operator) {
    case '>':
      return inclusive ? browserMajor >= version : browserMajor > version;
    case '<':
      return inclusive ? browserMajor <= version : browserMajor < version;
    case '=':
      return browserMajor === version;
  }
  return false;
}

const isEnabledForBrowser = (browsers) => {
  if (browsers === 'all') return true;
  const ua = navigator.userAgent;
  return Object.entries(browsers).some(b => matchesBrowser(...b));
}

const isEnabledForDistribution = (distribution) => {
  if (typeof distribution === 'number') return userSeed < (distribution * SEED_MAX);
  if (distribution.completion_date) {
    const completionDate = new Date(distribution.completion_date).getTime();
    const today = new Date().getTime();
    if (today >= completionDate) return true;
    const diff = completionDate - today;
    const left = Math.ceil(diff / timeMap[distribution.frequency || 'daily']);
    const dist = SEED_MAX / left;
    return userSeed <= dist;
  }
  return true;
}

export const isEnabled = (flag) => {
  const flagOpts = findFlag(flag);
  if (!flagOpts) return false;
  if (!isEnabledForBrowser(flagOpts.audience.browsers)) return false;
  if (!isEnabledForDistribution(flagOpts.audience.distribution)) return false;
  return true;
}
