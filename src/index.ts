import {
  Engine3D, Scene3D, View3D, CameraUtil,
  HoverCameraController, DirectLight, KelvinUtil,
  Object3D, CylinderGeometry, MeshRenderer, LitMaterial,
  Color, ColliderComponent, PointerEvent3D, AtmosphericComponent, 
  BoxColliderShape, Vector3, BoxGeometry, TorusGeometry, ComponentBase, 
  SphereColliderShape, MeshColliderShape, GeometryBase,
  Matrix4
} from '@orillusion/core';

const CYLINDER_LENGTH = 150;
const SQUARE_LENGTH = CYLINDER_LENGTH;
const CONE_LENGTH = CYLINDER_LENGTH / 4;
const TORUS_LENGTH = CYLINDER_LENGTH / 4;

class Sample {
  async run() {
    await Engine3D.init();

    const scene = new Scene3D();
    scene.exposure = 1.0;

    scene.addComponent(AtmosphericComponent);

    const cameraObj = CameraUtil.createCamera3DObject(scene);
    cameraObj.perspective(60, Engine3D.aspect, 0.1, 1000);
    

    const view = new View3D();
    view.scene = scene;
    view.camera = cameraObj;

    Engine3D.setting.pick.enable = true;
    Engine3D.setting.pick.mode = `bound`;

    const lightObj = new Object3D();
    const light = lightObj.addComponent(DirectLight);
    light.intensity = 3;
    light.lightColor = KelvinUtil.color_temperature_to_rgb(5500);
    lightObj.rotationX = 45;
    lightObj.rotationY = 45;
    scene.addChild(lightObj);

    const translationControlAnchor = new Object3D();
    translationControlAnchor.rotationX = -35;
    translationControlAnchor.addComponent(TranslationTransformControl);
    scene.addChild(translationControlAnchor);

    const rotationControlAnchor = new Object3D();
    rotationControlAnchor.rotationX = 35;
    rotationControlAnchor.x = -200;
    rotationControlAnchor.addComponent(RotationTransformControl);
    scene.addChild(rotationControlAnchor);

    const scaleControlAnchor = new Object3D();
    scaleControlAnchor.x = 250; 
    scaleControlAnchor.addComponent(ScaleTransformControl);
    scaleControlAnchor.rotationX = 50;
    scaleControlAnchor.rotationZ = -50;
    scaleControlAnchor.rotationY = -50;
    scene.addChild(scaleControlAnchor);

    Engine3D.startRenderView(view);
  }
}

class TransformControlReference extends ComponentBase {
  reference?: TransformControlBase;
}

class TransformControlBase extends ComponentBase {
  transformObject3D: Object3D;

  constructor() {
    super();
    this.transformObject3D = new Object3D();
    const reference = this.transformObject3D.addComponent(TransformControlReference)
    reference.reference = this;
  }

  init(){
    (window as any).object3D = this.object3D;
    (window as any).transformObject3D = this.transformObject3D;
  }

  public getScene(object3D: Object3D): Scene3D | undefined {
    let currentNode = object3D;
    while (currentNode.transform.parent) {
      currentNode = currentNode.transform.parent.object3D;
    }
    if (currentNode.isScene3D) {
      return currentNode as Scene3D;
    }
    return undefined;
  }

  onUpdate() {
    const transformScene = this.getScene(this.transformObject3D);
    const object3DScene = this.getScene(this.object3D);
    if (transformScene !== object3DScene) {
      this.transformObject3D.removeFromParent();
      if (object3DScene !== undefined) {
        object3DScene.addChild(this.transformObject3D);
      }
    }
    this.setMatrix();
  }

  private setMatrix() {
    let [position, rotation] = this.object3D.transform.worldMatrix.decompose();
    let transform = this.transformObject3D.transform;
    transform.localRotation = rotation;
    transform.localPosition = position;
  }
}

class MouseEventHandler extends ComponentBase {
  public isDragging: boolean = false;
  public lastX: number = 0;
  public lastY: number = 0;
  public originalColor: Color = new Color(0, 0, 0, 1);
  public axis?: 'x' | 'y' | 'z';
  public deltaX: number = 0;
  public deltaY: number = 0;
  public deltaWorldPosition?: Vector3;
  public lastWorldPosition?: Vector3;
  public pvMatrix: Matrix4;
  public pvMatrixInv: Matrix4;

  constructor() {
    super();
    this.pvMatrix = new Matrix4();
    this.pvMatrixInv = new Matrix4();
  }

  // stored from PICK_DOWN
  public startWorldPosition?: Vector3;
  public startDistance?: number;

  public getTarget(){
    return this.object3D
      .parentObject
      .getComponent(TransformControlReference)
      ?.reference
      ?.object3D;
  }

  public handlePickDown(event: PointerEvent3D) {
    this.isDragging = true;
    this.lastX = event.mouseX;
    this.lastY = event.mouseY;

    // Store initial values
    this.startWorldPosition = event.data.worldPos.clone();
    this.lastWorldPosition = this.startWorldPosition.clone();
    this.startDistance = event.data.distance;
    const camera = this.getCamera3D();
    this.pvMatrix = camera.pvMatrix.clone();
    this.pvMatrixInv = camera.pvMatrixInv.clone();
    // starting NDC: this.pvMatrix.transformVector(this.startWorldPosition)
    //  Also get initial NDC coordinates
    // Matrix Multiplication: Start world Position * PV matrix
    console.log("Drag started at:", this.startWorldPosition, "Distance:", this.startDistance);

    Engine3D.inputSystem.addEventListener(PointerEvent3D.POINTER_MOVE, this.handlePointerMove, this);
    Engine3D.inputSystem.addEventListener(PointerEvent3D.POINTER_UP, this.handlePointerUp, this);
  }

  public handlePointerMove(event: PointerEvent3D) {
    this.deltaX = event.mouseX - this.lastX;
    this.deltaY = event.mouseY - this.lastY;
    this.lastX = event.mouseX;
    this.lastY = event.mouseY;
  }

  public handlePointerUp(event: PointerEvent3D) {
    Engine3D.inputSystem.removeEventListener(PointerEvent3D.POINTER_MOVE, this.handlePointerMove, this);
    Engine3D.inputSystem.removeEventListener(PointerEvent3D.POINTER_UP, this.handlePointerUp, this);
  }

  public handlePickUp() {
    if (this.isDragging) {
      this.isDragging = false;
      console.log("Drag ended (mouse up object)");
    }
  }
  
  public handlePickOut() {
    if (this.isDragging) {
      this.isDragging = false;
      console.log("Drag ended (left object)");
    }
    this.object3D.getComponentsInChild(MeshRenderer).forEach((renderer: MeshRenderer) => {
      renderer.material.baseColor = this.originalColor.clone();
    });
  }

  public handlePickOver() {
    this.object3D.getComponentsInChild(MeshRenderer).forEach((renderer: MeshRenderer) => {
      const brighter = renderer.material.baseColor.clone();
      const brightenFactor = 0.3;
      brighter.r = Math.min(brighter.r + brightenFactor, 1);
      brighter.g = Math.min(brighter.g + brightenFactor, 1);
      brighter.b = Math.min(brighter.b + brightenFactor, 1);
      this.originalColor = renderer.material.baseColor.clone();
      renderer.material.baseColor = brighter;
    })
  }

  public handlePickMove(event: PointerEvent3D) {
    if (!this.isDragging) return;

    this.deltaX = event.mouseX - this.lastX;
    this.deltaY = event.mouseY - this.lastY;
    this.lastX = event.mouseX;
    this.lastY = event.mouseY;

    if (this.lastWorldPosition) {
      this.deltaWorldPosition = event.data.worldPos.clone().subtract(this.lastWorldPosition);
    }
    this.lastWorldPosition = event.data.worldPos.clone();
  }

  init() {
    const target = this.object3D;
    target.addEventListener(PointerEvent3D.PICK_DOWN, (e: PointerEvent3D) => this.handlePickDown(e), target);
    target.addEventListener(PointerEvent3D.PICK_UP, () => this.handlePickUp(), target);
    target.addEventListener(PointerEvent3D.PICK_OUT, () => this.handlePickOut(), target);
    target.addEventListener(PointerEvent3D.PICK_MOVE, (e: PointerEvent3D) => this.handlePickMove(e), target);
    target.addEventListener(PointerEvent3D.PICK_OVER, () => this.handlePickOver(), target);
  }

  public getScene(object3D: Object3D): Scene3D | undefined {
    let currentNode = object3D;
    while (currentNode.transform.parent) {
      currentNode = currentNode.transform.parent.object3D;
    }
    if (currentNode.isScene3D) {
      return currentNode as Scene3D;
    }
    return undefined;
  }

  public getCamera3D(){
    const scene = this.getScene(this.object3D);
    const camera = scene?.view?.camera;
    if (!camera) {
      console.warn("No camera found in the scene");
      throw new Error("No camera found in the scene");
    }
    return camera;
  }
}

class TranslationMouseEventHandler extends MouseEventHandler {
  handlePickDown(e: PointerEvent3D) {
    super.handlePickDown(e);
    if (e.ctrlKey) {
      const newShape = new BoxGeometry(
        Math.floor(Math.random() * 50) + 1,
        Math.floor(Math.random() * 50) + 1,
        Math.floor(Math.random() * 50) + 1
      );

      const shapeObject = new Object3D();
      const shapeRenderer = shapeObject.addComponent(MeshRenderer);
      shapeRenderer.geometry = newShape;
      shapeRenderer.material = new LitMaterial();

      shapeObject.y = (Math.random() *500);
      shapeObject.z = (Math.random() *-500);

      console.log("Arrow Clicked clicked! New shape:", newShape);
      this.object3D.addChild(shapeObject);
    }
  }

  handlePickMove(e: PointerEvent3D) {
    super.handlePickMove(e);
    if (!this.isDragging || !this.startWorldPosition) return;

    const axisVector = this.object3D.transform.worldMatrix.transformVector(new Vector3(0,1,0));
    axisVector.divideScalar(axisVector.length);

    // total distance from PICK_DOWN
    const totalDragDelta = this.lastWorldPosition?.clone().subtract(this.startWorldPosition) || new Vector3();
    const distance = totalDragDelta.dotProduct(axisVector);

    const target = this.getTarget();
    if (target && this.axis){
      if (this.axis === 'x') target.x += distance;
      else if (this.axis === 'y') target.y += distance;
      else if (this.axis === 'z') target.z += distance;
    } 
  }
}

class RotationMouseEventHandler extends MouseEventHandler {}

class ScaleMouseEventHandler extends MouseEventHandler {
  handlePickDown(e: PointerEvent3D) {
    super.handlePickDown(e);
    const newColor = new Color(Math.random(), Math.random(), Math.random());
    const boxrenderer = this.object3D.getComponent(MeshRenderer);
    this.originalColor = newColor.clone();
    boxrenderer.material.baseColor = newColor;
  }
  handlePickMove(e: PointerEvent3D) {
    super.handlePickMove(e);
    if (!this.isDragging) return;

    const target = this.getTarget();
    if (target) {
      const delta = 0.05;
      target.transform.scaleX += delta;
      target.transform.scaleY += delta;
      target.transform.scaleZ += delta;
    }
  }
}

class TranslationTransformControl extends TransformControlBase {
  constructor() {
    super();
    const coordinateAxes = this.transformObject3D;

    const arrowX = this.createArrow(new Color(1, 0, 0), 'x');
    arrowX.rotationZ = -90;
    coordinateAxes.addChild(arrowX);
    const arrowY = this.createArrow(new Color (0, 1, 0), 'y');
    coordinateAxes.addChild(arrowY);
    const arrowZ = this.createArrow(new Color (0, 0, 1), 'z');
    coordinateAxes.addChild(arrowZ);
    arrowZ.rotationX = 90;
  }
  createArrow(color: Color, axisName: 'x' | 'y' | 'z') {
    const arrow = new Object3D();
    arrow.name = `Arrow-${axisName}`;

    const cylinder = this.createCylinder(color);
    cylinder.y = CYLINDER_LENGTH / 2;
    arrow.addChild(cylinder);

    const cone = this.createCone(color)
    cone.y = CYLINDER_LENGTH + CONE_LENGTH / 2;
    arrow.addChild(cone);

    const collider = arrow.addComponent(ColliderComponent);
    collider.shape = new BoxColliderShape().setFromCenterAndSize(
      new Vector3(0, CYLINDER_LENGTH / 2 + CONE_LENGTH / 2, 0),
      new Vector3(40, CYLINDER_LENGTH + CONE_LENGTH, 40)
    );

    const mouseEventHandler = arrow.addComponent(TranslationMouseEventHandler);
    mouseEventHandler.axis = axisName;

    return arrow;
  }
  createCylinder(color: Color){
    const cylinder = new Object3D();
    const geometry = new CylinderGeometry(10, 10, CYLINDER_LENGTH, 32, 1, false);
    const material = new LitMaterial();
    material.baseColor = color.clone();
    const renderer = cylinder.addComponent(MeshRenderer);
    renderer.geometry = geometry;
    renderer.material = material;

    return cylinder;
  }

  createCone(color: Color){
    const cone = new Object3D();
    const conegeometry = new CylinderGeometry(0, 20, CONE_LENGTH, 32, 1, false);
    const conematerial = new LitMaterial();
    conematerial.baseColor = color;
    const conerenderer = cone.addComponent(MeshRenderer);
    conerenderer.geometry = conegeometry;
    conerenderer.material = conematerial;

    const conecollider = cone.addComponent(ColliderComponent);
    conecollider.shape = new BoxColliderShape().setFromCenterAndSize(
    new Vector3(0, 0, 0),
    new Vector3(20, CONE_LENGTH / 2, 20)
    );

    return cone;
  }
}

class RotationTransformControl extends TransformControlBase {
  constructor() {
    super();
    const rotationAxes = this.transformObject3D;
    const torusZ = this.createTorus(new Color(0, 0, 1));
    torusZ.rotationZ = -90;
    rotationAxes.addChild(torusZ);

    const torusX = this.createTorus(new Color(1, 0, 0));
    rotationAxes.addChild(torusX);

    const torusY = this.createTorus(new Color(0, 1, 0));
    torusY.rotationX = 90;
    rotationAxes.addChild(torusY);
  }

  createTorus(color: Color) {
    const torus = new Object3D();
    const torusgeometry = new TorusGeometry(100, 5, 32, 64);
    const torusmaterial = new LitMaterial();
    torusmaterial.baseColor = color;
    const torusrenderer = torus.addComponent(MeshRenderer);
    torusrenderer.geometry = torusgeometry;
    torusrenderer.material = torusmaterial;

    let collider = torus.addComponent(ColliderComponent);
    collider.shape = new MeshColliderShape();

    torus.addComponent(RotationMouseEventHandler);

    return torus;
  }
}

class ScaleTransformControl extends TransformControlBase {
  constructor() {
    super();
    const scaleAxes = this.transformObject3D;
    const boxX = this.createBox(new Color(1, 0, 0), 'x');
    boxX.rotationZ = -90;
    boxX.x = SQUARE_LENGTH /2;
    scaleAxes.addChild(boxX);

    const boxY = this.createBox(new Color(0, 1, 0), 'y');
    boxY.y = SQUARE_LENGTH /2 ; 
    scaleAxes.addChild(boxY);

    const boxZ = this.createBox(new Color(0, 0, 1), 'z');
    boxZ.z = SQUARE_LENGTH /2 ; 
    boxZ.rotationX = 90;
    scaleAxes.addChild(boxZ);
  }

  createBox(color: Color, axisName: 'x' | 'y' | 'z'){
    const box = new Object3D();
    const boxgeometry = new BoxGeometry(20, 150,20);
    const boxmaterial = new LitMaterial();
    boxmaterial.baseColor = color;
    const boxrenderer = box.addComponent(MeshRenderer);
    boxrenderer.geometry = boxgeometry;
    boxrenderer.material = boxmaterial;
    let boxcollider = box.addComponent(ColliderComponent);
    boxcollider.shape = new BoxColliderShape().setFromCenterAndSize(new Vector3(0, 0, 0),new Vector3(10, 75, 10));
  
    const mouseEventHandler = box.addComponent(ScaleMouseEventHandler);
    mouseEventHandler.axis = axisName;
  
    return box;
  }
}

(async () => {
  const app = new Sample();
  await app.run();
})();
