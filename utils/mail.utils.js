const nodemailer = require('nodemailer');

// 创建邮件传输器配置
const transporterConfig = {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE === 'false' ? false : true, // true表示使用SSL
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
};

// 检查配置完整性
if (!process.env.MAIL_HOST || !process.env.MAIL_PORT || !process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
  console.error('警告: 未设置邮件配置环境变量，请确保在.env文件中设置了所有必要的邮件配置');
}

// 创建邮件传输器
const transporter = nodemailer.createTransport(transporterConfig);

/**
 * 发送邮件
 * @param {Object} options - 邮件选项
 * @param {string} options.to - 收件人邮箱
 * @param {string} options.subject - 邮件主题
 * @param {string} options.text - 纯文本内容（可选）
 * @param {string} options.html - HTML内容（可选）
 * @returns {Promise} - 发送结果
 */
exports.sendMail = async (options) => {
  try {
    // 验证必要参数
    if (!options.to) {
      throw new Error('收件人邮箱不能为空');
    }
    if (!options.subject) {
      throw new Error('邮件主题不能为空');
    }
    if (!options.text && !options.html) {
      throw new Error('邮件内容不能为空 (text 或 html)');
    }

    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('邮件发送失败:', error);
    throw error;
  }
};

/**
 * 发送验证邮件
 * @param {Object} user - 用户信息
 * @param {string} token - 验证令牌
 * @returns {Promise} - 发送结果
 */
exports.sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333;">验证您的电子邮箱</h2>
      <p>亲爱的 ${user.username}，</p>
      <p>感谢您注册医疗知识学习平台。请点击下面的按钮验证您的电子邮箱地址：</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">验证邮箱</a>
      </p>
      <p>或者，您可以复制以下链接并粘贴到浏览器中：</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p>此链接将在24小时后过期。</p>
      <p>如果您没有注册，请忽略此邮件。</p>
      <p>祝好，<br>医疗知识学习平台团队</p>
    </div>
  `;

  return this.sendMail({
    to: user.email,
    subject: '验证您的医疗知识学习平台账户',
    html: html,
    text: `亲爱的 ${user.username}，请点击以下链接验证您的电子邮箱：${verificationUrl}`
  });
};

/**
 * 发送密码重置邮件
 * @param {Object} user - 用户信息
 * @param {string} token - 重置令牌
 * @returns {Promise} - 发送结果
 */
exports.sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333;">重置您的密码</h2>
      <p>亲爱的 ${user.username}，</p>
      <p>您收到此邮件是因为您（或其他人）请求重置您医疗知识学习平台账户的密码。请点击下面的按钮设置新密码：</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">重置密码</a>
      </p>
      <p>或者，您可以复制以下链接并粘贴到浏览器中：</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p>此链接将在2小时后过期。</p>
      <p>如果您没有请求重置密码，请忽略此邮件，您的账户密码将保持不变。</p>
      <p>祝好，<br>医疗知识学习平台团队</p>
    </div>
  `;

  return this.sendMail({
    to: user.email,
    subject: '重置您的医疗知识学习平台密码',
    html: html,
    text: `亲爱的 ${user.username}，请点击以下链接重置您的密码：${resetUrl}`
  });
};

// 在启动时测试邮件配置
(async () => {
  // 仅在开发环境下，如果配置了MAIL_TEST=true，发送测试邮件
  if (process.env.NODE_ENV === 'development' && process.env.MAIL_TEST === 'true') {
    try {
      await transporter.verify();
      console.log('邮件服务器连接成功');
      
      if (process.env.MAIL_TEST_RECIPIENT) {
        const testResult = await exports.sendMail({
          to: process.env.MAIL_TEST_RECIPIENT,
          subject: '医疗知识学习平台 - 邮件系统测试',
          html: '<p>这是一封测试邮件，用于验证邮件系统配置是否正确。</p>'
        });
        console.log('测试邮件发送成功:', testResult);
      }
    } catch (error) {
      console.error('邮件服务器连接失败:', error);
    }
  }
})(); 