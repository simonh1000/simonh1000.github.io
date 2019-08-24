# [simonh1000.github.io](http://simonh1000.github.io/)

## Install on Ubuntu 19.04

```
delete lockfile
sudo apt-get install bundler
sudo apt-get install libxslt-dev libxml2-dev
sudo apt install zlib1g-dev
bundle install --path ~/.gem
```

## Development with drafts

```
bundle exec jekyll serve --drafts
```

## Production build

```
bundle exec jekyll serve
```
