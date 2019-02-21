const domain = {
  prod: 'matchmaking.the-block-project.org',
  stage: 'matchmaking-stage.the-block-project.org',
  dev: 'matchmaking-dev.the-block-project.org'
}[process.env.STAGE];

const messages = {
  'CustomMessage_AdminCreateUser': ({ request, response }) => {
    let {
      userAttributes: {
        given_name: givenName,
        family_name: familyName
      },
      usernameParameter: username,
      codeParameter: password
    } = request;

    response.emailSubject = 'Welcome to The BLOCK Project Matchmaking System';
    response.emailMessage = [
      '<html>',
      '  <head>',
      '    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro" rel="stylesheet" type="text/css">',
      '  </head>',
      '  <body style="width: 60%;margin: 0 auto; font-family: source sans pro">',
      '    <section style="margin-top: 2em; background-color: black; padding: 1em 3em">',
      '      <h1 style="text-align:center; color: white"><b>Welcome to The BLOCK Project Matchmaking System</b></h1>',
      '    </section>',
      '    <section style="color: black; border-style: solid; border-color: black; padding: 1em 3em">',
      '      <p style="line-height:1.5em">',
      `        Hi ${givenName} ${familyName},`,
      '      </p>',
      '      <p style="line-height:1.5em">',
      '        We are so blessed to have you with us. To sign in the system, please click',
      `        <a style="color:black" href="http://${domain}" target="_blank">THIS LINK</a>`,
      '        and enter the following information:',
      '      </p>',
      '      <ul style="padding-left: 1em">',
      `        <li><b>Email:</b> ${username}</li>`,
      `        <li><b>Password:</b> ${password}</li>`,
      '      </ul>',
      '      <p style="line-height:1.5em">',
      '        This is a temporary password and you will be asked to change it after signing in.',
      '        If you have any issue signing in, feel free to contact Sarah at',
      '        <a style="color:black" href="mailto:sarah@facinghomelessness.org" target="_blank">sarah@facinghomelessness.org</a>.',
      '      </p>',
      '      <br>',
      '      <p>',
      '        Warmly,',
      '        <br>',
      '        The BLOCK Project Team',
      '      </p>',
      '    </section>',
      '  </body>',
      '</html>'
    ].join('\n');
  },
  'CustomMessage_ForgotPassword': ({ request, response }) => {
    let {
      userAttributes: {
        given_name: givenName,
        family_name: familyName
      },
      codeParameter: confirmationCode
    } = request;

    response.emailSubject = 'Password reset for The BLOCK Project Matchmaking System';
    response.emailMessage = [
      '<html>',
      '  <head>',
      '    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro" rel="stylesheet" type="text/css">',
      '  </head>',
      '  <body style="width: 60%;margin: 0 auto; font-family: source sans pro">',
      '    <section style="margin-top: 2em; background-color: black; padding: 1em 3em">',
      '      <h1 style="text-align:center; color: white"><b>Forgot Your Password? No Problem!</b></h1>',
      '    </section>',
      '    <section style="background-color:white; border-style: solid; border-color: black; padding: 1em 3em">',
      '      <p style="line-height:1.5em">',
      `        Hi ${givenName} ${familyName},`,
      '      </p>',
      '      <p style="color: black; line-height:1.5em">',
      `        Here is the confirmation code you can use to reset your password: <b>${confirmationCode}</b>`,
      '      </p>',
      '      <p style="line-height:1.5em">',
      '        If you did not reques a password reset, you can ignore the email; no changes have been made.',
      '        <br>',
      '        Any other issues resetting your password? Feel free to contact Sarah at',
      '        <a style="color:black" href="mailto:sarah@facinghomelessness.org">sarah@facinghomelessness.org</a>.',
      '      </p>',
      '      <p>',
      '        Warmly,',
      '        <br>',
      '        The Block Project Team',
      '      </p>',
      '    </section>',
      '  </body>',
      '</html>'
    ].join('\n');
  }
};

function cognitoMessage(event, context, callback) {
  let fn = messages[event.triggerSource];
  if (fn) {
    fn(event);
  }

  callback(null, event);
}

module.exports = cognitoMessage;
