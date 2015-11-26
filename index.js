'use strict'
const seneca = require('seneca')()
const senecaContext = require('seneca-context')

seneca.use(require('seneca-context/plugins/setContext'), {createContext: (req, res, context, done) => {
  const tenant = req.hostname.match(/([^\.]+)/)[1]
  setImmediate(() => done(null, {tenant}))
}})

seneca.add({role:'api', cmd:'post'}, function (args, done) {
  const si = this
  console.log('Context is', senecaContext.getContext(si).tenant)
  si.make('blog/posts').save$(args.post, done)
})

seneca.act({role:'web', use:{
  prefix: '/api/',
  pin: {role:'api', cmd:'*'},
  map: {
    'post': {GET: true}
  }
}})

const app = require('express')()
const bodyparser = require('body-parser')
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))
app.use(seneca.export('web'))
app.listen(8020)
