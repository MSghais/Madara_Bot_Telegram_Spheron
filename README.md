# Madara TG Bot

Create your .env with your own variables like the .env.exemple

You need: 
- Port otherwise 3080 by default
- A TG Bot API_KEY
- Mongo DB url on Atlas or whatever
- Password key encryption for encrypted Spheron api key by users

pnpm i

## Where is

Folders:
- Telegram with Bot and Service
- User: User service, Spheron service, Secure Key
- Menu: Setup command for menu and start
- Database: model and database
- Madara-nodes-bot: Every scenes of the bot with logic behind: Management, Token, Deploy, Status
- Share: Shared sender menu 


## What you can do

- Add your spheron token by chat id on Telegram
- Deploy your Madara Sequencer on Spheron
- Obtain nformation instance deployment and connections urls
- Get all your clusters on Spheron
- Get all your Instances on Spheron
- Close instance
- Delete Instance

## Architecture Overview:

Controllers: Handle incoming Telegram messages and delegate them to appropriate services.

Services: Contain the business logic and handle different functionalities of the bot.

Menus: Create and manage the menu system.

DTOs (Data Transfer Objects): Define data structures for incoming and outgoing messages.

Providers: Manage state and interactions with external services (e.g., databases).

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ pnpm install
```

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```
