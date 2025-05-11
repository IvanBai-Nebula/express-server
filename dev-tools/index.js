// 开发工具入口文件
module.exports = {
  // 在这里添加开发工具功能
  setupRoutes: (app) => {
    // 示例: 添加开发工具路由
    app.get('/dev', (req, res) => {
      res.json({
        message: '开发工具面板',
        tools: [
          { name: '路由列表', path: '/dev/routes' },
          { name: '数据库浏览', path: '/dev/db' }
        ]
      });
    });
  }
};