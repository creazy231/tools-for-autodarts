import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./app.vue";
import routes from "~pages";
import "../assets/base.scss";
import "./index.scss";

routes.push({
  path: "/",
  redirect: "/popup",
});

routes.push({
  path: "/colors",
  redirect: "/popup/colors",
});

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  if (to.path === "/") {
    return next("/popup");
  }

  next();
});

createApp(App).use(router).mount("#app");

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`,
  );
};
