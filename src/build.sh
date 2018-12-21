#!/bin/bash
cd ../
rm -rf public/*
cp -R functions/nuxt/dist/ public/assets
cp -R src/static/* public