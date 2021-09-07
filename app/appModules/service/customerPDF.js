class CustomerPDF {
  constructor(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
    this.mysql = require('mysql');
    this.config = this.req.app.get('config');
    delete require.cache[this.config.root +'/config/mysql.json'];
    this.cfg = require(this.config.root +'/config/mysql.json').devDB;;
    this.QRCode = require('qrcode');
    this.pdf = require('html-pdf');
    this.fs = require('fs');
  }
  tpl = (str, vars) =>{
    var func = new Function(...Object.keys(vars),  "return `"+ str +"`;")
    return func(...Object.values(vars));
  }
  getRecord(callback) {
    const me = this;
    const connection = me.mysql.createConnection(me.cfg);
    connection.connect();
    const sql = "SELECT * FROM `authUsers`";
    connection.query(sql, function (err, result, fields) {
      if (err) {
        me.onError(err.message)
      } else {
        callback(result);
      }
    });
    connection.end();
  }
  sendPDF(hashCode) {
    const me = this;
    const fnDoc = __dirname + '/tpl/mailQrCodeDoc.html';
    const linkUrl = 'http://142.93.73.66:3001/scanSignin/' + hashCode;
    me.QRCode.toDataURL(linkUrl, { 
      width:256,
      type: 'image/png',
      quality: 1.0,
      color: {
          dark: '#000000',  
          light: '#0000'
      }
    }, (err, str)=>{

        me.fs.readFile(fnDoc, 'utf-8', (err, doc)=> {
          try {
            const html = me.tpl(doc, {linkUrl: linkUrl, qrCode : str});
            const htmlFn = '/var/_shared/PDF/input/' + hashCode + '.html';
            const pdfFn = '/var/_shared/PDF/output/' + hashCode + '.html.pdf';
            me.fs.writeFile(htmlFn, html, (err, doc)=> {
              setTimeout(()=>{
                me.res.sendFile(pdfFn);
              }, 2000);
            });
          } catch (err) {
            me.res.send(err.message + '=>' + doc);
          }
        });
    });
  }
  run() {
    const me = this;
    me.getRecord(
      (rec) => {
        me.sendPDF((!rec || !rec[0]) ? '' : rec[0].authCode);
      }
    ); 
    return true;
  }
  onError(message) {
    const me = this;
    me.res.send({status: 'failure',  message: message});
  }
}
module.exports  = CustomerPDF;
