import Garfish from 'garfish';
import React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Layout,
  Menu,
  Breadcrumb,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Spin,
} from '@arco-design/web-react';
import { Grid } from '@arco-design/web-react';
import {
  IconCaretRight,
  IconCaretLeft,
  IconPlus,
  IconMinus,
} from '@arco-design/web-react/icon';
import { observer } from 'mobx-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { basename } from '../../constant';
import { subAppMenus as defaultSubAppMenus } from '../constant';
import logo from '../../static/img/Garfish.png';
import homeSvg from '../../static/icons/Home.svg';
import newSvg from '../../static/icons/New.svg';
import StarcoinSignIn from '../Web3/starcoinSignIn';
import { getDaoPlugins } from '../../utils/dao';

import { loadModule } from '@garfish/remote-module';
import { IDAO, IApp } from '../../extpoints/daoApp.interface';
import { useDao } from '../../contexts/DaoContext';

import './index.less';

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;
const Sider = Layout.Sider;
const Header = Layout.Header;
const Footer = Layout.Footer;
const Content = Layout.Content;
const FormItem = Form.Item;
const formItemLayout = {
  labelCol: {
    span: 6,
  },
  wrapperCol: {
    span: 18,
  },
};

const Row = Grid.Row;
const Col = Grid.Col;

const App = observer(({ store }: { store: any }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const storeRef = useRef(JSON.stringify(store));
  const [subAppMenus, setSubAppMenus] =
    useState<Array<any>>(defaultSubAppMenus);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [visible, setVisible] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Array<string>>([]);
  const [breadcrumbData, setBreadcrumbData] = useState<Array<string>>([]);
  const defaultOpenKeys = [
    location.pathname.replace(`/${basename}/`, '').split('/')[0],
  ];
  const { registerApp } = useDao()
  const [pluginLoaded, setPluginLoaded] = useState(false)

  const adapter_uri = (res:String) => {
    if (res.startsWith("ipfs:://")) {
      const ipfs_cid = res.substring(8)
      //return `https://ipfs.filebase.io/ipfs/${ipfs_cid}`.toString()
      return "https://ipfs.filebase.io/ipfs/QmR2qsFESkhDe4Sgr1MazzfXUbUGc2CBa7vG6p2u9ALzUF"
    } else {
      return res.toString()
    }
  }

  class TheDAO implements IDAO {
    public name: string

    constructor(name) {
      this.name = name
    }

    async registerApp(app: IApp) {
      const activeWhen = `/newRegister${app.activeWhen}`

      // 调用 Garfish.registerApp 动态注册子应用
      Garfish.registerApp({
        name: this.name,
        basename: "/examples",
        activeWhen: activeWhen,
        entry: "cached",
      });

      subAppMenus.push({
        key: app.name,
        icon: <img src={newSvg} className="sidebar-item-icon" />,
        title: `【PluginApp】${app.name}`,
        path: activeWhen,
      });
  
      setSubAppMenus(subAppMenus);
    }
  }

  // 当 store.counter 变化时，才 emit stateChange
  useEffect(() => {
    if (JSON.parse(storeRef.current).counter !== store.counter) {
      window?.Garfish?.channel.emit('stateChange');
      storeRef.current = JSON.stringify(store);
    }
  }, [JSON.stringify(store.counter), location]);

  useEffect(() => {
    const _path = location.pathname.replace(`/${basename}/`, '');
    if (_path) {
      setSelectedKeys([_path]);
      setBreadcrumbData(_path.split('/'));
      store.setActiveApp(_path);
    }
  }, [location]);

  useEffect(async () => {
    if (pluginLoaded) {
      return
    }

    
    const daoPlugins:any = await getDaoPlugins();

    for (const i in daoPlugins) {
      const plugin_info = daoPlugins[i];

      const app = await Garfish.preLoadApp(plugin_info.name, {
        entry: adapter_uri(plugin_info.js_entry_uri)
      })

      const theDao = new TheDAO(plugin_info.name)
      const modules = app?.cjsModules.exports;
      modules?.setup(theDao);
    }

    setPluginLoaded(true)

  }, [location]);

  const handleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed]);

  const getSubMenu = () => {
    return subAppMenus.map((v) => {
      return v.routes?.length > 0 ? (
        <SubMenu
          key={v.key}
          title={
            <span>
              {v.icon}
              {v.title}
            </span>
          }
        >
          {v.routes.map((k) => {
            return (
              <MenuItem
                key={k.path}
                onClick={
                  () =>
                    Garfish.router.push({
                      path: k.path,
                      query: k.query,
                    })
                  // window.history.pushState(
                  //   {},
                  //   'react',
                  //   `/${basename}/${k.path}`,
                  // )
                }
              >
                {k.title}
              </MenuItem>
            );
          })}
        </SubMenu>
      ) : (
        <MenuItem
          key={v.key}
          onClick={() => Garfish.router.push({ path: v.path })}
        >
          {v.icon}
          {v.title}
        </MenuItem>
      );
    });
  };

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [form] = Form.useForm();

  const onOk = async () => {
    setVisible(false);
    form.validate().then((res: any) => {
      setConfirmLoading(true);
      // 调用 Garfish.registerApp 动态注册子应用
      Garfish.registerApp({
        ...res,
        props: {
          [res.props.key]: res.props.value,
        },
      });

      subAppMenus.push({
        key: res.name,
        icon: <img src={newSvg} className="sidebar-item-icon" />,
        title: `【新增子应用】${res.name}`,
        path: res.path,
      });

      setSubAppMenus(subAppMenus);
      setTimeout(() => {
        setVisible(false);
        setConfirmLoading(false);
      }, 1500);
    });
  };

  return (
    <Layout>
      <Sider
        collapsed={collapsed}
        resizeDirections={['right']}
        collapsible
        trigger={null}
        breakpoint="xl"
        style={{ height: '100vh' }}
      >
        <div
          className="logo"
          onClick={() => navigate(`/${basename}/main/index`)}
        >
          <img src={logo} alt="logo" />
        </div>

        <Menu
          defaultOpenKeys={defaultOpenKeys}
          selectedKeys={selectedKeys}
          style={{ width: '100%' }}
        >
          <MenuItem
            key="main/index"
            onClick={() => navigate(`/${basename}/main/index`)}
          >
            <img src={homeSvg} className="sidebar-item-icon" />
            【主应用】首页
          </MenuItem>
          {getSubMenu()}
        </Menu>
      </Sider>

      <Layout>
        <Header>
          <h3 className="counter">全局 Counter : {store.counter}</h3>

          <Button
            style={{ margin: '0 10px' }}
            type="primary"
            onClick={() => store.increment()}
            size="mini"
          >
            <IconPlus />
          </Button>
          <Button size="mini" type="primary" onClick={() => store.decrement()}>
            <IconMinus />
          </Button>

          <Button
            size="mini"
            style={{ margin: '0 10px' }}
            type="primary"
            status="warning"
            onClick={() => setVisible(true)}
          >
            新增应用
          </Button>

          <Row style={{ width: '100%' }} justify="end">
            <Col flex='100px'>
              <StarcoinSignIn/>
            </Col>
         </Row>
        </Header>
        <Layout style={{ padding: '0 24px' }}>
          {
            <Breadcrumb style={{ margin: '16px 0' }}>
              {breadcrumbData.map((v) => (
                <Breadcrumb.Item key={v}>{v}</Breadcrumb.Item>
              ))}
            </Breadcrumb>
          }
          <Content>
            <Outlet />
            <div id="submodule">
              {!store.isMounted && store.isMounted !== undefined && (
                <Spin style={{ marginTop: '20%' }} />
              )}
            </div>
            <div id="sub-container"></div>
          </Content>
          <Footer> </Footer>
        </Layout>
      </Layout>

      <Modal
        title="新增应用"
        visible={visible}
        onOk={onOk}
        confirmLoading={confirmLoading}
        onCancel={() => setVisible(false)}
      >
        <Form
          {...formItemLayout}
          form={form}
          initialValues={{
            name: 'vue2-new',
            entry: 'http://localhost:8094/',
            basename: '/examples',
            activeWhen: '/newRegister/vue2-new',
            path: '/newRegister/vue2-new',
            props: {
              key: 'msg',
              value: 'hello',
            },
          }}
        >
          <FormItem label="appName" field="name" required>
            <Input placeholder="" />
          </FormItem>
          <FormItem label="entry" required field="entry">
            <Input placeholder="" />
          </FormItem>
          <FormItem label="basename" required field="basename">
            <Input placeholder="" />
          </FormItem>
          <FormItem label="activeWhen" required field="activeWhen">
            <Input placeholder="" />
          </FormItem>
          <FormItem label="根路径" field="path" required>
            <Input placeholder="" />
          </FormItem>

          <FormItem label="props">
            <Space>
              <FormItem field="props.key" rules={[{ required: true }]} noStyle>
                <Input />
              </FormItem>
              <FormItem
                field="props.value"
                rules={[{ required: true }]}
                noStyle
              >
                <Input />
              </FormItem>
            </Space>
          </FormItem>
        </Form>
      </Modal>
    </Layout>
  );
});

export default App;
