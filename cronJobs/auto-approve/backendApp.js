const tools = require('./tools');
const md5 = require('md5');
module.exports = class App extends tools {
    constructor() {
        super();
        const p = __dirname.split('/cronJobs/')
        this.config = {
            root : p[0],
            isDocker: /^\/var\/app\//.test(p[0]) ? true : false
        }
        this.dbCfg = require(this.config.root + '/app/config/mysql.json').devDB;
        this.mysql = require('mysql');
        this.dbCfg.host = (this.config.isDocker) ?  this.dbCfg.host : '127.0.0.1';
    }
    output() {
        const me = this;
        const connection = me.mysql.createConnection(me.dbCfg);
        connection.connect();
        const sql = "SELECT * FROM `application`";
        connection.query(sql, function (err, result) {
          if (err) {
            console.log({status: 'failure', message:err.message});
          } else {
              me.process(result);
          }
        });
        connection.end();
        
    }
    process(v) {
        const values =[];
        const fields = ['authCode', 'address', 'description', 'roles', 'specialFoodie', 'created', 'status'];
        for (let i = 0; i < v.length; i++ ) {
            values.push([
                md5(v[i].address), 
                v[i].address, v[i].publisher, 
                v[i].type, 
                (v[i].type === 'foodie') ? 1 : 0,
                new Date(),
                0
            ]);
        }
        const me = this;
        const connection = me.mysql.createConnection(me.dbCfg);
        connection.connect();
        const sql = "INSERT INTO authUsers (`" + fields.join('`,`') + "`) VALUES ?";
        connection.query(sql, [values], function (err, result) {
            if (err) {
                console.log({status: 'failure', message:err.message});
            } else {
              console.log({status: 'success', data: result});
            }
          });
        connection.end();
    }
}