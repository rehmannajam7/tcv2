
<div align="center">

<img src="https://github.com/Ilhasoft/weni-webapp/raw/main/src/assets/LogoWeniAnimada.svg" height="100" />
  
[![codecov](https://codecov.io/gh/weni-ai/floweditor/branch/main/graph/badge.svg?token=TZHJ6L2U7R)](https://codecov.io/gh/weni-ai/weni-integrations-webapp) [![Build Status](https://github.com/weni-ai/floweditor/workflows/Build/badge.svg)](https://github.com/nyaruka/floweditor/actions?workflow=Build) [![License: MPL 2.0](https://img.shields.io/badge/License-AGPL_3.0-brightgreen.svg)](https://opensource.org/license/agpl-v3/)

# :desktop_computer: Flow Editor

</div>

# About

This is a flow editing tool designed for use within the [Flows Module](https://github.com/weni-ai/flows) suite of messaging tools but can be adopted for use outside of that ecosystem. The editor is a React component built with TypeScript and bundled with Webpack. It is open-sourced under the AGPL-3.0 license.
> [Usability documentation](https://docs.weni.ai/l/pt)
![image](https://github.com/weni-ai/floweditor/assets/30026625/24b8c464-6f20-414f-87d2-3c0f5f696209)


# Technologies

- [React](https://react.dev/)
- [Sass](https://sass-lang.com/)
- [i18n](https://www.i18next.com/)
- [Axios](https://axios-http.com/ptbr/docs/intro)
- [Unnnic](https://github.com/weni-ai/unnnic) (Weni's design system) 

# Requirements
Before running the application, make sure you have installed the following tools on your machine:

- [Node.js >= 10.x](https://nodejs.org/en)
- [Yarn](https://yarnpkg.com/)
# Set up
1. Open the terminal and clone the repository
```
  git clone https://github.com/weni-ai/floweditor.git
```
2. Enter the created directory
```
  cd floweditor
```
3. Install the dependencies:
```
  yarn install
```

# How to develop
To run the flow editor in development mode, it requires an asset server. This is what is responsible for serving up flow definitions, groups, contact fields, etc. This project includes an in memory asset server for testing purposes. These are the same lambda functions used by our Netlify preview site.

First, compile and run the local version for a faux asset server.
```
yarn lambda
```
Then you are ready to fire up the development server for the editor.
```bash
yarn start
```
<br/> 

### Localization

The project is fully localized using `i18next` and leans on `react-i18next` to integrate it inside components. To generate new keys and defaults for localization, we use `i18next-scanner`. Use the yarn command `scan` to update localization keys.
```bash
yarn scan
```
### Running Tests
This project uses [Jest](https://facebook.github.io/jest/) for unit/snapshot testing and [react-testing-library](https://testing-library.com/docs/react-testing-library/intro) where we can. The project has some older more complex tests that use [Enzyme](https://github.com/airbnb/enzyme). Typescript and Jest are integrated via [ts-jest](https://github.com/kulshekhar/ts-jest).
```
yarn test
```
Note that running this locally will automatically multithread based on how many cores your box has. It will also run it in the interactive watch mode. This mode is what you can use to easily run only failed tests or update snapshots. When this same command is run on CI, the tests will be run without watch mode automatically.
You can also run tests locally without watch mode
```
yarn test --watchAll=false
```
### Formatting
[Prettier](https://github.com/prettier/prettier) is used to keep formatting consistent. We use huskey pre-commit hooks to run prettier on every commit.
It is possible to run prettify against the entire project without commits. This is only necessary if the project conventions change.
```
yarn run prettify
```
### Publishing
To publish, simply invoke the desired semver -- patch, minor or major. This will version the package and travis will publish it to the npm repository automatically.
```
yarn version --patch
git push --tags
```

# Development Workflow

| Command | Description |
|--|--|
| yarn install | Install dependencies
| yarn lambda | Compile and run the local version for a faux asset server at localhost:8000
| yarn start | Serve with hot reload at localhost:3000
| yarn build | Build for production with minification
| yarn build --report | Build for production and view the bundle analyzer report
| yarn test | Run all tests

# Open-Source Governance
The Weni Platform open source projects are governed by @weni-ai. Weni opens all its software parts under terms of an open-source license to reach potential users and partners mainly. Secondly, Weni wants to reach developers by building a community for some pieces that are more reusable in other businesses or software projects, such as NLP models or tools. Besides that, the openness of our software is also related to building trust by enabling our external stakeholders to audit the security of our software.

# Community
- Join our [community chat](https://community-chat.weni.ai) to discuss with our internal team
- Join [#dev](https://community-chat.weni.ai/channel/dev) for help from the community to development issues

# Contributing

**We are looking for collaboration from the Open Source community!** There's so much we want to do, 
including but not limited to: enhancing existing applications with new features, 
optimizing the NLP tasks and algorithms involved that boost accuracy, new communication channels and integrations.

* Please read our [contribution guidelines](https://github.com/ilhasoft/weni-platform/blob/main/.github/CONTRIBUTING.md) for details on what and how you can contribute.

* Report a bug by using [this guideline](https://github.com/ilhasoft/weni-platform/blob/main/.github/CONTRIBUTING.md#report-a-bug) 
for details on what and how you can contribute.