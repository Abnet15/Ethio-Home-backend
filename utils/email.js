const nodemailer = require('nodemailer');
const pug = require('pug');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `ETHIO Home ${process.env.EMAIL_FROM}`;
  }

  newTransport() {
   if (process.env.NODE_ENV === 'production') {
      // Gmail for production
      console.log('here is')
      return nodemailer.createTransport({
        service: 'Gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USERNAME, // e.g., no-reply@ethiohome.com
          pass: process.env.GMAIL_APP_PASSWORD // App Password from Google
        },
        tls: {
          ciphers: 'SSLv3'
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASSWORD
      }
    });
  }

  // Send the actual email
  async send(template, subject,message,actionLink,actionText) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email.pug`, {
      firstName: this.firstName,
      url: this.url,
      email: this.to
      ,subject, template, message, actionLink, actionText
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }
  

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the ETHIO Home Family!');
  }
  async sendPasswordReset() {
    await this.send('passwordReset','Your password reset token (valid for only one hours)' );
  }
  async updatePassword() {
    await this.send('updatePassword','Your password has been changed.' );
  }
  async accountUpdate() {
    await this.send('accountUpdate','Your account has been updated.');
  }
};
