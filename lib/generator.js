const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const service = express();
const ViewManagement = require('./lib/ViewManagement');
const Redis = require('ioredis');

const {
    EnapsoAuthenticationProvider
} = require('../enapso-authentication/enapso-authenticationprovider');

const {
    EnapsoAuthorizationProvider
} = require('../enapso-authorization/enapso-authorizationprovider');

module.exports = async (config) => {
    const log = config.log();
    try {
        this.authenticationProvider = new EnapsoAuthenticationProvider(config);

        this.authorizationProvider = new EnapsoAuthorizationProvider(config);
    } catch (e) {
        log.error(e);
        log.debug(
            'Failed to connect to the IAM provider (Keycloak). Please check the connection and configuration settings to ensure they are correct.'
        );
        process.exit(1);
    }
    config.authorizationProvider = this.authorizationProvider;
    config.authenticationProvider = this.authenticationProvider;
    config.service = service;
    service.use(express.json()); //Used to parse JSON bodies
    service.use(express.urlencoded({ extended: true })); //Parse URL-encoded bodies

    service.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Credentials', true);
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token, Authorization, X-Enapso-Auth'
        );
        res.header(
            'Access-Control-Expose-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token, Authorization, X-Enapso-Auth'
        );

        res.header(
            'Access-Control-Allow-Methods',
            'POST, GET, OPTIONS, PUT, DELETE, PATCH'
        );

        next();
    });

    const viewManagement = new ViewManagement(config);
    const swaggerOptions = {
        swaggerDefinition: {
            info: {
                title: 'View Management Service',
                version: '1.0.0',
                description:
                    'View Management Service simplifies handling complex data of knowledge graph with customizable queries and easy creation of data operation templates, making data work more user-friendly.',
                license: {
                    name: 'ENAPSO licence',
                    url: 'https://innotrade.atlassian.net/wiki/spaces/ENAPSODOCS/pages/2139062384/ENAPSO+license'
                }
            },
            host: config.host,
            schemes: [config.schemes],
            basePath: '/enapso-dev/view-management/v1',
            securityDefinitions: {
                ApiKeyAuth: {
                    description: '',
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-ENAPSO-AUTH'
                }
            },
            security: [
                {
                    ApiKeyAuth: []
                }
            ]
        },
        apis: [path.join(__dirname, '../swagger-documentation/swagger-docs.js')]
    };
    const specs = swaggerJsdoc(swaggerOptions);
    // console.log(JSON.stringify(specs));
    var options = {
        customSiteTitle: 'Innotrade GmbH',
        customfavIcon:
            'https://static.wixstatic.com/media/c3c9ad_7282ccd2e56541dc9cf5ee0ff6f7bca4~mv2.jpg/v1/fill/w_32%2Ch_32%2Clg_1%2Cusm_0.66_1.00_0.01/c3c9ad_7282ccd2e56541dc9cf5ee0ff6f7bca4~mv2.jpg',
        customCss: `
    	 .topbar-wrapper img {content:url(\'https://static.wixstatic.com/media/c3c9ad_8ecd0a5e184844679c698dcf6dd404e7~mv2.png/v1/fill/w_400,h_101,al_c,q_85,usm_0.66_1.00_0.01/InnotradeLogo_transp.webp');width:450px; height:80px;}
    	.swagger-ui .topbar { background-color: white; }
      //   .topbar-wrapper img:after {
      // }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background-color: #326DB3; }

      .swagger-ui .opblock.opblock-post{
    	border-color: #326DB3;
    	background:white;

      }

    	`
    };
    // service.get('/*', (req, res, next) => {
    //     let splitUrl = req.url.split('/');
    //     let modUrl = `/${splitUrl[splitUrl.length - 2]}/${
    //         splitUrl[splitUrl.length - 1]
    //     }`;

    //     req.url = modUrl;
    //     next();
    // });

    function modifyUrl(req, res, next) {
        let splitUrl = req.url.split('/');
        let modUrl = `/${splitUrl[splitUrl.length - 2]}/${
            splitUrl[splitUrl.length - 1]
        }`;
        req.url = modUrl;
        next();
    }
    service.post('/*', modifyUrl);
    service.put('/*', modifyUrl);
    service.delete('/*', modifyUrl);
    service.patch('/*', modifyUrl);
    service.get('/*', modifyUrl);
    service.use(
        '/api-docs',
        swaggerUi.serveFiles(specs),
        swaggerUi.setup(specs, options)
    );
    service.use(
        '/api-docs',
        express.static(
            path.join(
                __dirname,
                '../node_modules/swagger-ui-dist/swagger-ui.css'
            )
        )
    );
    try {
        if (config.graphdb.cache != 'self') {
            let cacheUpdateTrigger;

            let redisOptions = {};

            if (!config.redis.sentinel_enabled) {
                redisOptions = {
                    port: config.redis.port, // Redis port
                    host: config.redis.host, // Redis host
                    // username: 'default', // needs Redis >= 6
                    password: config.redis.password,
                    db: config.redis.database // Defaults to 0
                    // password: config.redis.password
                };
            } else {
                let sentinels = [];

                if (
                    config.redis.sentinel_host_0 &&
                    config.redis.sentinel_port_0
                ) {
                    sentinels.push({
                        host: config.redis.sentinel_host_0,
                        port: config.redis.sentinel_port_0
                    });
                }
                if (config.redis.sentinel_host_1 && sentinel_port_1) {
                    sentinels.push({
                        host: config.redis.sentinel_host_1,
                        port: config.redis.sentinel_port_1
                    });
                }
                if (config.redis.sentinel_host_2 && sentinel_port_2) {
                    sentinels.push({
                        host: config.redis.sentinel_host_2,
                        port: config.redis.sentinel_port_2
                    });
                }

                redisOptions = {
                    sentinels: sentinels,
                    name: config.redis.sentinel_name
                };
                if (config.redis.password) {
                    redisOptions['password'] = config.redis.password;
                }
                if (config.redis.sentinel_password) {
                    redisOptions['sentinelPassword'] =
                        config.redis.sentinel_password;
                }
            }

            cacheUpdateTrigger = new Redis(redisOptions);
            cacheUpdateTrigger.on('error', (error) => {
                log.error(error, 'Redis error');

                log.debug(
                    'Failed to connect to Redis: invalid credentials or Redis not running. Please check the Redis credentials in your configuration and verify that Redis is running on the specified host and port.'
                );
            });
            cacheUpdateTrigger.subscribe('updateCache', (err, count) => {});

            cacheUpdateTrigger.on('message', async (channel, message) => {
                if (channel == 'updateCache') {
                    await viewManagement.updateCache(message);
                }
            });
            // viewManagement.setRedisClients(cacheUpdateTrigger);
        }
        await viewManagement.connect(config);
    } catch (e) {
        log.error(e, 'GraphDB Connection Error');
        log.debug(
            'Unable to connect to the graph database. Please ensure that the graph database service is running and that the connection details specified in your configuration are correct.'
        );

        process.exit(1);
    }

    // Add a request logging middleware in development mode
    if (service.get('env') === 'development') {
        service.use((req, res, next) => {
            log.debug(`${req.method}: ${req.url}`);
            return next();
        });
    }
    if (service.get('env') === 'production') {
        service.use((req, res, next) => {
            log.info(`${req.method}: ${req.url}`);
            return next();
        });
    }
    // authentication middleware
    service.use(async (req, res, next) => {
        next();
    });

    service.post(
        '/v1/read-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'read-template'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                if (req.body.templateType == 'layout') {
                    req.body.cls = 'http://ont.enapso.com/views#LayoutTemplate';
                } else {
                    req.body.cls = 'http://ont.enapso.com/views#SPARQLTemplate';
                }
                return await viewManagement.readIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/create-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'create-template'),
        viewManagement.makeORM.bind(this),
        async (req, res, next) => {
            try {
                if (req.body.templateType == 'layout') {
                    req.body.cls = 'http://ont.enapso.com/views#LayoutTemplate';
                } else {
                    req.body.cls = 'http://ont.enapso.com/views#SPARQLTemplate';
                    req.body.type = 'template';
                }
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.createIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/update-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'update-template'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                if (req.body.templateType == 'layout') {
                    req.body.cls = 'http://ont.enapso.com/views#LayoutTemplate';
                } else {
                    req.body.cls = 'http://ont.enapso.com/views#SPARQLTemplate';
                    req.body.type = 'template';
                }
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.updateIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/delete-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'delete-template'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                if (req.body.templateType == 'layout') {
                    req.body.cls = 'http://ont.enapso.com/views#LayoutTemplate';
                } else {
                    req.body.cls = 'http://ont.enapso.com/views#SPARQLTemplate';
                }
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.deleteIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/read-variable',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'read-variable'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                req.body.cls = 'http://ont.enapso.com/views#TemplateVariable';
                return await viewManagement.readIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/create-variable',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'create-variable'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                req.body.cls = 'http://ont.enapso.com/views#TemplateVariable';
                req.body.type = 'variable';
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.createIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/update-variable',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'update-variable'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                req.body.cls = 'http://ont.enapso.com/views#TemplateVariable';
                req.body.graph = config.graphdb.namedGraph;
                req.body.type = 'variable';
                return await viewManagement.updateIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/delete-variable',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'delete-variable'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                req.body.cls = 'http://ont.enapso.com/views#TemplateVariable';
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.deleteIndividual(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/remove-variable-from-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'remove-variable-from-template'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                req.body.property =
                    'http://ont.enapso.com/views#hasTemplateVariables';
                req.body.parent = req.body.template;
                req.body.child = req.body.variable;
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.deleteIndividualRelation(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/add-variable-to-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'add-variable-to-template'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                req.body.property =
                    'http://ont.enapso.com/views#hasTemplateVariables';
                req.body.parent = req.body.template;
                req.body.child = req.body.variable;
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.createIndividualRelation(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/execute-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(this, 'execute-template'),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                return await viewManagement.executeTemplate(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );
    service.post(
        '/v1/execute-layout-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'execute-layout-template'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                return await viewManagement.executeLayoutTemplate(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/execute-template-by-name',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'execute-template-by-name'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                return await viewManagement.executeTemplateByName(req, res);
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/create-endpoint-4-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'create-endpoint-4-template'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                return await viewManagement.createEndpoint4Template(req, res, {
                    svc: service,
                    authenticate: this.authenticationProvider,
                    authorize: this.authorizationProvider
                });
            } catch (err) {
                return next(err);
            }
        }
    );

    service.post(
        '/v1/delete-endpoint-of-template',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'delete-endpoint-of-template'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                return await viewManagement.deleteEndpointOfTemplate(req, res, {
                    svc: service,
                    authenticate: this.authenticationProvider,
                    authorize: this.authorizationProvider
                });
            } catch (err) {
                return next(err);
            }
        }
    );
    service.post(
        '/v1/generate-openApi-specification-for-template-endpoint',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'generate-openApi-specification-for-template-endpoint'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                return await viewManagement.generateOpenAPISpecificationForTemplate(
                    req,
                    res,
                    { service, express }
                );
            } catch (err) {
                return next(err);
            }
        }
    );
    service.post(
        '/v1/create-crud-sparql-template-4-class',
        this.authenticationProvider.isAuthenticated.bind(this),
        this.authorizationProvider.isAuthorized.bind(
            this,
            'create-crud-sparql-template-4-class'
        ),
        viewManagement.makeORM.bind(this),

        async (req, res, next) => {
            try {
                req.body.graph = config.graphdb.namedGraph;
                return await viewManagement.createCrudSPARQLTemplate4Class(
                    req,
                    res
                );
            } catch (err) {
                return next(err);
            }
        }
    );

    // eslint-disable-next-line no-unused-vars
    service.use((error, req, res, next) => {
        res.status(error.status || 500);
        // Log out the error to the console
        //	log.error(error);
        return res.json({
            error: {
                message: error.message
            }
        });
    });

    return service;
};
