#!/bin/bash
npm run build
cd ../
rm -rf public/*
cp -R functions/nuxt/dist/ public/assets
cp -R src/static/* public
cd functions
npm run serve