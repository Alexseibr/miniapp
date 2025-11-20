#!/bin/bash
export NODE_ENV=development
export PORT=5000
exec tsx server/marketplace.ts
