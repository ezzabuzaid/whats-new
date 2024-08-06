// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/server.ts
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/core/github-webhooks.ts
import {
  Webhooks,
  createNodeMiddleware
} from "@octokit/webhooks";
var webhooks = new Webhooks({
  secret: "04062d0a92fed0522c47a23e8441300d533a3b1fc1139e0960128abb91728371",
  log: console
});
function isEventOfType(event, ...types) {
  const eventName = "action" in event.payload ? `${event.name}.${event.payload.action}` : event.name;
  return types.includes(eventName);
}
function onGithubEvent(event, ...middlewares) {
  webhooks.on(event, async (event2) => {
    for (const middleware of middlewares) {
      let canContinue = await middleware(event2);
      if (canContinue === false) {
        break;
      }
    }
  });
}
async function receiveGithubEvents(request, response, path) {
  let body = "";
  let statusCode = 200;
  let headers = {};
  const orignalEnd = response.end;
  const originalWriteHead = response.writeHead;
  response.end = function(...args) {
    body = args[0];
    return this;
  };
  response.writeHead = function(...args) {
    statusCode = args[0];
    headers = args[1];
    return this;
  };
  Object.defineProperty(response, "statusCode", {
    set: function(value) {
      statusCode = value;
    }
  });
  const handler = createNodeMiddleware(webhooks, {
    path,
    log: console
  });
  const processed = await handler(request, response);
  response.end = orignalEnd;
  response.writeHead = originalWriteHead;
  return {
    processed,
    body,
    statusCode,
    headers
  };
}

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/identity/merged.policy.ts
async function merged(event) {
  if (isEventOfType(event, "pull_request.closed")) {
    return event.payload.pull_request.merge;
  }
  return false;
}

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/core/validation.ts
import Ajv from "ajv";
import addErrors from "ajv-errors";
import addFormats from "ajv-formats";
import { ProblemDetailsException } from "rfc-7807-problem-details";
import validator from "validator";
var ajv = new Ajv({
  allErrors: true,
  useDefaults: "empty",
  removeAdditional: "failing",
  coerceTypes: true
});
addErrors(ajv);
addFormats(ajv);
function isBetween(date, startDate, endDate) {
  if (!date) {
    return false;
  }
  if (!startDate) {
    return false;
  }
  if (!endDate) {
    return false;
  }
  return validator.isAfter(date, startDate) && validator.isBefore(date, endDate);
}
var validations = [
  ["isBefore", validator.isBefore],
  ["isAfter", validator.isAfter],
  ["isBoolean", validator.isBoolean],
  ["isDate", validator.isDate],
  ["isNumeric", validator.isNumeric],
  ["isLatLong", validator.isLatLong],
  ["isMobilePhone", validator.isMobilePhone],
  ["isEmpty", validator.isEmpty],
  ["isDecimal", validator.isDecimal],
  ["isURL", validator.isURL],
  ["isEmail", validator.isEmail],
  ["isBetween", isBetween]
];
validations.forEach(([key, value]) => {
  const keyword = key;
  ajv.addKeyword({
    keyword,
    validate: (schema, data) => {
      if (schema === void 0 || schema === null) {
        return false;
      }
      const func = value;
      return func.apply(validator, [
        data,
        ...Array.isArray(schema) ? schema : [schema]
      ]);
    }
  });
});
function createSchema(properties) {
  const required = [];
  const requiredErrorMessages = {};
  for (const [key, value] of Object.entries(
    properties
  )) {
    if (value.required) {
      required.push(key);
    }
    if ("errorMessage" in value && value.errorMessage?.required) {
      requiredErrorMessages[key] = value.errorMessage.required;
      delete value.errorMessage.required;
    }
  }
  const extendSchema = {};
  if (Object.keys(requiredErrorMessages).length) {
    extendSchema["errorMessage"] = {
      required: requiredErrorMessages
    };
  }
  const clearProperties = Object.fromEntries(
    Object.entries(properties).map(
      ([key, value]) => {
        const { required: required2, ...rest } = value;
        return [key, rest];
      }
    )
  );
  return {
    type: "object",
    properties: clearProperties,
    required,
    additionalProperties: false,
    ...extendSchema
  };
}
function validateInput(schema, input) {
  const validate = ajv.compile(schema);
  const valid = validate(input);
  if (!valid && validate.errors) {
    throw formatErrors(validate.errors);
  }
}
function formatErrors(errors, parent) {
  return errors.reduce(
    (acc, it) => {
      if (it.keyword === "errorMessage") {
        return {
          ...acc,
          ...formatErrors(it.params["errors"], it)
        };
      }
      const property = (it.instancePath || it.params["missingProperty"]).replace(".", "").replace("/", "");
      return {
        ...acc,
        [property]: parent?.message || it.message || ""
      };
    },
    {}
  );
}
var ValidationFailedException = class extends ProblemDetailsException {
  constructor(errors) {
    super({
      type: "validation-failed",
      status: 400,
      title: "Bad Request.",
      detail: "Validation failed."
    });
    this.Details.errors = errors;
  }
};
function validateOrThrow(schema, input) {
  try {
    validateInput(schema, input);
  } catch (errors) {
    throw new ValidationFailedException(errors);
  }
}

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/features/website/updates/send-whats-new-to-discord.command.ts
var sendWhatsNewToDiscordSchema = createSchema({
  filesUrl: {
    type: "string"
  },
  body: {
    type: "string"
  },
  avatar_url: {
    type: "string"
  }
});
async function sendWhatsNewToDiscord({
  filesUrl,
  body,
  avatar_url
}) {
  const prFile = await fetch(filesUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  }).then(
    (res) => res.json()
  );
  const theFile = prFile.find(
    (it) => it.filename.endsWith(".md")
  );
  await fetch(
    process.env.DISCORD_WEBHOOK_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: "NewsBot",
        content: body,
        avatarUrl: avatar_url,
        url: `https://january.sh/posts/${theFile.filename}`
      })
    }
  );
  return {};
}

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/features/website/listeners/send-whats-new-to-discord.listener.ts
async function sendWhatsNewToDiscord2({
  payload,
  name
}) {
  console.log(
    `${name}.${payload.action}`,
    "has been triggered"
  );
  const filesUrl = `${payload.pull_request._links.self.href}/files`;
  const input = {
    filesUrl,
    body: payload.pull_request.body,
    avatar_url: payload.pull_request.head.user.avatar_url
  };
  validateOrThrow(
    sendWhatsNewToDiscordSchema,
    input
  );
  await sendWhatsNewToDiscord(input);
}

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/features/website/website.github.ts
onGithubEvent(
  "pull_request.closed",
  merged,
  sendWhatsNewToDiscord2
);

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/main.ts
import { Hono as Hono2 } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/core/data-source.ts
import {
  DataSource,
  DefaultNamingStrategy
} from "typeorm";

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/features/entites.ts
var entites_default = [];

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/core/data-source.ts
var NamingStrategy = class extends DefaultNamingStrategy {
  tableName(targetName, userSpecifiedName) {
    return super.tableName(
      userSpecifiedName ?? targetName,
      void 0
    );
  }
};
var options = {
  type: "postgres",
  useUTC: true,
  url: process.env.CONNECTION_STRING,
  migrationsRun: true,
  entities: [...entites_default],
  logging: false,
  // process.env.NODE_ENV !== 'production'
  synchronize: true,
  // process.env.NODE_ENV !== 'production'
  ssl: process.env.NODE_ENV === "production",
  namingStrategy: new NamingStrategy()
};
var data_source_default = new DataSource(options);

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/features/integrations/integrations.router.ts
import { Hono } from "hono";
var router = new Hono();
router.post(
  "/github/webhooks",
  async (context, next) => {
    const nodeContext = context.env;
    const { processed, body, headers, statusCode } = await receiveGithubEvents(
      nodeContext.incoming,
      nodeContext.outgoing,
      "/integrations/github/webhooks"
    );
    if (!processed) {
      return context.body("", 400);
    }
    return context.body(
      body,
      statusCode,
      headers
    );
  }
);
var integrations_router_default = ["/integrations", router];

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/features/routes.ts
var routes_default = [integrations_router_default];

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/identity/authorize.ts
import {
  ProblemDetails,
  ProblemDetailsException as ProblemDetailsException2
} from "rfc-7807-problem-details";

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/identity/subject.ts
async function loadSubject(token) {
  return null;
}

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/main.ts
import { ProblemDetailsException as ProblemDetailsException3 } from "rfc-7807-problem-details";
var application = new Hono2();
application.use(cors(), logger());
application.use(async (context, next) => {
  const subject = await loadSubject(
    context.req.header("Authorization")
  );
  context.set("subject", subject);
  await next();
});
application.onError((err, context) => {
  console.error(err);
  if (err instanceof ValidationFailedException) {
    context.status(400);
    return context.json(err);
  }
  if (err instanceof ProblemDetailsException3) {
    context.status(
      err.Details.status ?? 500
    );
    return context.json(err.Details);
  }
  context.status(500);
  return context.json({
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred"
  });
});
routes_default.forEach((route) => {
  application.route(...route);
});
data_source_default.initialize().then(() => {
  console.log("Database initialized");
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
application.get("/", (context, next) => {
  return context.json({
    status: "UP"
  });
});
application.get("/health", async (context, next) => {
  await data_source_default.query("SELECT 1");
  return context.json({
    status: "UP"
  });
});
var main_default = application;

// ../../../../../private/var/folders/yg/phstvz0s4wn78jf4brpn5qs80000gn/T/77681eff-9e2c-48fc-a884-27742efc57a8/src/server.ts
import { relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { showRoutes } from "hono/dev";
var dirRelativeToCwd = relative(
  process.cwd(),
  dirname(fileURLToPath(import.meta.url))
);
main_default.use(
  "/:filename{.+.png$}",
  serveStatic({ root: dirRelativeToCwd })
);
main_default.use(
  "/:filename{.+.swagger.json$}",
  serveStatic({
    root: dirRelativeToCwd,
    rewriteRequestPath: (path) => path.split("/").pop()
  })
);
serve({
  fetch: main_default.fetch,
  port: parseInt(process.env.PORT ?? "3000", 10)
});
console.log(
  `Server running at http://localhost:${process.env.PORT ?? "3000"}`
);
if (process.env.NODE_ENV === "development") {
  showRoutes(main_default, {
    verbose: true
  });
}
