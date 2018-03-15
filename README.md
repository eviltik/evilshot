# evilshot
Web Application Monitoring Tool

## under the wood
* it use puppeteer (chrome headless browser)

## status
* work in progress

## install
```
npm i evilshot -g
```

## usage

Single URL:
```
evilshot --url=https://github.com [options]');
```

Multiple URLs:
```
evilshot --urls=data/urls.csv [options]');
```

Options:
```
    --out   directory to export reports and screenshots (default ./report)');
--browser   show chrome browser (default false)');
```
