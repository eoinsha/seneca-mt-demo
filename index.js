'use strict'
const _ = require('lodash')
const seneca = require('seneca')()
const senecaContext = require('seneca-context')

// Seneca context to set tenant in context from HTTP host
seneca.use(require('seneca-context/plugins/setContext'), {createContext: (req, res, context, done) => {
  const tenant = req.hostname.match(/([^\.]+)/)[1]
  setImmediate(() => done(null, {tenant}))
}})

// Blog microservice
seneca.add({role:'api', cmd:'post'}, function (args, done) {
  this.make('blog/posts').save$(args.post, done)
})

// Blog API
seneca.act({role:'web', use:{
  prefix: '/api/',
  pin: {role:'api', cmd:'*'},
  map: {'post': {GET: true}}
}})

// Tenant Registry
const opts = { host: '127.0.0.1', port: 27017 };
['a','b','c','d'].forEach(
    (tenant) => { seneca.use(`mongo-store$${tenant}`, _.assign(opts, {name: tenant, map:{[`${tenant}/-/-`]:'*'}})) }
)

// Store Interceptor
seneca.ready(() => {
  seneca.wrap({role:'entity'}, function (interceptedMessage, done) {
    const seneca = this
    const message = seneca.util.clean(interceptedMessage)
    if (_.isUndefined(message.zone) && !(message.base === 'sys' && message.name === 'entity')) {
      const data = message.ent.data$()
      const context = senecaContext.getContext(seneca)
      const canon = message.ent.canon$({object: true})
      message.ent = seneca.make$(context.tenant, canon.base, canon.name).data$(data)
      message.qent = message.qent && message.ent
      message.zone = context.tenant
    } 
    return seneca.prior(message, done)
  })
  // Application Server
  const app = require('express')()
  const bodyparser = require('body-parser')
  app.use(bodyparser.json())
  app.use(seneca.export('web'))
  app.listen(8020)
})
