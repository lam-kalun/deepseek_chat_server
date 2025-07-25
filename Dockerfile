# 使用官方 Node.js 轻量级镜像.
# https://hub.docker.com/_/node
FROM node:22-alpine

RUN apk add --update nodejs npm pnpm tsx

# 设置时区
RUN apk add tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo Asia/Shanghai > /etc/timezone && \
    apk del tzdata

# 定义工作目录
WORKDIR /app

# 将依赖定义文件拷贝到工作目录下
COPY package*.json ./

# 使用国内镜像源安装依赖
RUN npm config set registry https://registry.npmjs.org/ 
RUN pnpm install
RUN pnpm run build_mcp_server

# 将本地代码复制到工作目录内
COPY . .

# 暴露端口
EXPOSE 6060

# 启动服务
CMD [ "npm", "run", "dev" ]