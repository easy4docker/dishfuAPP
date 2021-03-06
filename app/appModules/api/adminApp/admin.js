class Admins {
  constructor(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;

  }
  makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() *  charactersLength));
   }
   return result;
  }
  checkPhone() {
    const me = this;
    const eng = me.req.app.get('mysqlEngine');

    eng.queryOnly('SELECT * FROM admin WHERE `phone` = "' + me.req.body.data.phone + '"', (resultData)=> {
      if (resultData.status !== 'success') {
        me.processPhone(resultData);
      } else {
        if (resultData.result && resultData.result.length) {
          me.processPhone(resultData);
        } else {
          me.processPhone({status: 'failure', message:'The phone ' + me.req.body.data.phone + ' is not authrized.'} );
        }
      }
    });
  }
  processPhone(data) {
    const me = this;
    if (data.status !== 'success') {
      me.res.send(data);
    } else {
      me.addIntoAdminSession(
        (result)=> {


          if (result.status !== 'success') {
              me.res.send(result);
          } else {
            const insertId = result.data.insertId;
            const  twilioCFG = require('/var/_config/sms/twilio.json');

            const accountSid = twilioCFG.accountSid; 
            const authToken = twilioCFG.authToken; 
            const messagingServiceSid = twilioCFG.messagingServiceSid;
            const client = require('twilio')(accountSid, authToken); 

            client.messages 
              .create({ 
                 body: 'Dishfu mobile authentication ' + me.req.get('origin') +'/LinkFromMobile/' +  insertId + '/' + me.req.body.data.token + '/',  
                 messagingServiceSid: messagingServiceSid,      
                 to: '+1' + me.req.body.data.phone 
               }) 
              .then(message => message)
              .catch(err => {
                me.res.send({status: 'failure', message: err.message});
              }).done((message)=> {
                if (message) {
                  me.res.send({status: 'success', data: message});
                }
              });
          }
        }
      );
      return true;
    }
  }
  addIntoAdminSession(callback) {
    const me = this;
    
    const values = [
      me.req.body.data.phone, 
      me.req.body.data.visitorId, 
      me.req.body.data.token, 
      me.req.body.data.token, 
      me.makeid(32), 
      new Date()
    ];

    const eng = me.req.app.get('mysqlEngine');
    const sql = "INSERT INTO adminSession (`phone`, `visitorId`, `token`, `socketid`, `authcode`, `created`) VALUES ?";

    eng.queryInsert(sql, [[values]], (resultData)=> {
      callback((resultData.status !== 'success') ? resultData: {status: 'success', data: resultData.result});
    });
  }

  getAdminSessionRecord() {
    const me = this;
    const eng = me.req.app.get('mysqlEngine');
    eng.queryOnly( "SELECT * FROM `adminSession` WHERE `id` = '" + me.req.body.data.recid + "' AND " +
    "`token` = '" + me.req.body.data.token + "'", (resultData)=> {
        me.res.send(resultData);
    });
  }

  getTargetSocket() {
    const me = this;
    const eng = me.req.app.get('mysqlEngine');

    const sql = "SELECT * FROM `adminSession` WHERE `phone` = '" + me.req.body.data.phone + "' AND " +
        "`token` = '" + me.req.body.data.token + "'"
    
    eng.queryOnly( sql, (resultData)=> {
        me.res.send(resultData);
    });
  }

  addSessionRecord() {
    const me = this;
    const connection = me.mysql.createConnection(me.cfg);
    const sql = "SELECT `id` FROM  `adminSession`  " + 
        " WHERE `visitorId` = '" + me.req.body.data.visitorId + "'  " +
        " AND `token` = '" + me.req.body.data.token + "' " +
        " AND `phone` = '" + me.req.body.data.phone + "' ";
    connection.query(sql, function (err, result) {
      if (err) {
        me.res.send({status: 'failure', message:err.message});
      } else {
        if (!result.length) {
          me.changeSessionRecord('add'); 
        } else {
          
          me.res.send({status: 'success', data: result, pp:888});
        }
      }
    });
    connection.end();
    
  }
  updateSessionRecord() {
    this.changeSessionRecord('update'); 
  }
  deleteSessionRecord() {
    this.changeSessionRecord('delete'); 
  }

  changeSessionRecord(code)  {
    const me = this;
    const connection = me.mysql.createConnection(me.cfg);
    connection.connect();
    if (code === 'delete') {
        const sql = "DELETE FROM  adminSession  " + 
        " WHERE `visitorId` = '" + me.req.body.data.visitorId + "'  " +
        " AND `token` = '" + me.req.body.data.token + "' " +
        " AND `phone` = '" + me.req.body.data.phone + "' ";
        connection.query(sql, function (err, result) {
          if (err) {
            me.res.send({status: 'failure', message:err.message});
          } else {
            me.res.send({status: 'success', data: result});
          }
        });
      } else if (code === 'add') {
        const values = [
          me.req.body.data.phone, me.req.body.data.visitorId, me.req.body.data.token, me.req.body.data.token, me.makeid(32), new Date()
        ]
        const sql = "INSERT INTO adminSession (`phone`, `visitorId`, `token`, `socketid`, `authcode`, `created`) VALUES ?";
        connection.query(sql, [[values]], function (err, result) {
          if (err) {
            me.res.send({status: 'failure', message:err.message});
          } else {
            me.res.send({status: 'success', data: result, ppp:999});
          }
        });
      }  else  {
        const sql = "UPDATE adminSession  SET `socketid` = '" + me.req.body.data.socketid + "', `created` = NOW()" + 
        " WHERE `visitorId` = '" + me.req.body.data.visitorId + "'  " +
        " AND `token` = '" + me.req.body.data.token + "' " +
        " AND `phone` = '" + me.req.body.data.phone + "' ";
        connection.query(sql, function (err, result) {
          if (err) {
            me.res.send({status: 'failure', message:err.message});
          } else {
            me.res.send({status: 'success', data: result + '==='+sql});
          }
        });
      } 
    connection.end();
  }

  checkTokenAuthCode() {
    const me = this;
    const eng = me.req.app.get('mysqlEngine');
    const sql = "SELECT * FROM `adminSession` WHERE `authcode` = '" + me.req.body.data.authcode + "'";
    eng.queryOnly(sql, (resultData)=> {
      me.res.send(resultData);
    });
  }
  actionError() {
    const me = this;
    me.res.send({status: 'failure',  message: 'Action Error!'});
  }
}
module.exports  = Admins;
