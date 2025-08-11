import {
  Engine3D, Scene3D, View3D, CameraUtil,
  HoverCameraController, DirectLight, KelvinUtil,
  Object3D, CylinderGeometry, MeshRenderer, LitMaterial,
  Color, ColliderComponent, PointerEvent3D, AtmosphericComponent, BoxColliderShape, Vector3, BoxGeometry, TorusGeometry, ComponentBase,
  scale
} from '@orillusion/core';
const CYLINDER_LENGTH = 150; // Length of the cylinders
const SQUARE_LENGTH = CYLINDER_LENGTH; // Length of the square transforms
const CONE_LENGTH = CYLINDER_LENGTH / 4; // Length of the cones
const TORUS_LENGTH = CYLINDER_LENGTH/4; // Length of the torus

class Sample {
  // Initialize the engine and set up the scene, basic camera and lighting
  async run() {
    await Engine3D.init();

    // Create scene
    const scene = new Scene3D();
    scene.exposure = 1.0;

    // Add atmospheric sky
    const sky = scene.addComponent(AtmosphericComponent);

    // Create camera
    const cameraObj = CameraUtil.createCamera3DObject(scene);
    cameraObj.perspective(60, Engine3D.aspect, 0.1, 1000);
    const camCtrl = cameraObj.object3D.addComponent(HoverCameraController);
    camCtrl.setCamera(0, 0, 100); // look at origin from z = 100

    // Create View3D
    const view = new View3D();
    view.scene = scene;
    view.camera = cameraObj;

    //Pick and pick type need to be configured before the engine starts
    Engine3D.setting.pick.enable = true;
    // Bound: ray box picking, pixel: frame buffer picking
    Engine3D.setting.pick.mode = `bound`; // or 'pixel'

    // Add light
    const lightObj = new Object3D();
    const light = lightObj.addComponent(DirectLight);
    light.intensity = 3;
    light.lightColor = KelvinUtil.color_temperature_to_rgb(5500);
    lightObj.rotationX = 45;
    lightObj.rotationY = 45;
    scene.addChild(lightObj);
    sky.relativeTransform = light.transform;

    //const controlsInit = new TransformInit(scene);
    //controlsInit.init();
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

    //Add transform controls, classes and functions later

    // Start render
    Engine3D.startRenderView(view);
  }
}

class TransformInit extends ComponentBase {
  scene: Scene3D;
   constructor(scene: Scene3D) {
    super();
    this.scene = scene;
  }
  
  init() {
    const translationControlAnchor = new Object3D();
    translationControlAnchor.rotationX = -35;
    translationControlAnchor.addComponent(TranslationTransformControl);
    this.scene.addChild(translationControlAnchor);
    const rotationControlAnchor = new Object3D();
    rotationControlAnchor.x = -200;
    rotationControlAnchor.rotationX = 35;
    rotationControlAnchor.addComponent(RotationTransformControl);
    this.scene.addChild(rotationControlAnchor);
    const scaleControlAnchor = new Object3D();
    scaleControlAnchor.x = 250;
    scaleControlAnchor.addComponent(ScaleTransformControl);
    this.scene.addChild(scaleControlAnchor);
  }
}

class TransformControlBase extends ComponentBase {
  transformObject3D: Object3D;

  constructor() {
    super();
    this.transformObject3D = new Object3D();
  }

  init(){
    // this.object3D.addChild(this.transformObject3D);
    // TODO remove these debug lines
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
    //In the wrong scene
    if (transformScene !== object3DScene) {
      this.transformObject3D.removeFromParent();
      if (object3DScene !== undefined) {
        object3DScene.addChild(this.transformObject3D);
      }
    }
    this.setMatrix();
  }

  private setMatrix() {
    let [position, rotation, scale] = this.object3D.transform.worldMatrix.decompose();
    let transform = this.transformObject3D.transform;
    transform.localRotation = rotation;
    transform.localPosition = position;
    transform.localScale = scale;
  }
}


class TranslationTransformControl extends TransformControlBase {
  constructor() {
    super();
    const coordinateAxes = this.transformObject3D;
    const cylinderX = this.createCylinder(new Color(1, 0, 0));
    cylinderX.rotationZ = -90;
    cylinderX.x = CYLINDER_LENGTH / 2;
    coordinateAxes.addChild(cylinderX);

    const cylinderY = this.createCylinder(new Color(0, 1, 0));
    cylinderY.y = CYLINDER_LENGTH / 2;
    coordinateAxes.addChild(cylinderY);

    const cylinderZ = this.createCylinder(new Color(0, 0, 1));
    cylinderZ.rotationX = 90;
    cylinderZ.z = CYLINDER_LENGTH / 2;
    coordinateAxes.addChild(cylinderZ);

    const coneX = this.createCone(new Color (1,0,0))
    coneX.rotationZ = -90;
    coneX.x = CYLINDER_LENGTH + CONE_LENGTH / 2;
    coordinateAxes.addChild(coneX);

    const coneY = this.createCone(new Color (0,1,0))
    coneY.y = CYLINDER_LENGTH + CONE_LENGTH / 2;
    coordinateAxes.addChild(coneY);

    const coneZ = this.createCone(new Color (0,0,1))
    coneZ.rotationX = 90;
    coneZ.z = CYLINDER_LENGTH + CONE_LENGTH / 2;
    coordinateAxes.addChild(coneZ);
  }

  createCylinder(color: Color){
    const cylinder = new Object3D();
    const geometry = new CylinderGeometry(10, 10, CYLINDER_LENGTH, 32, 1, false);
    //geometry.center = true;
    const material = new LitMaterial();
    material.baseColor = color.clone();
    const renderer = cylinder.addComponent(MeshRenderer);
    renderer.geometry = geometry;
    renderer.material = material;

    // Store the original color for restoring
    const originalColor = color.clone();

    // Collider setup
    const collider = cylinder.addComponent(ColliderComponent);
    collider.shape = new BoxColliderShape().setFromCenterAndSize(
    new Vector3(0, 0, 0),
    new Vector3(10, CYLINDER_LENGTH / 2, 10)
  );

    // Hover in (highlight)
    cylinder.addEventListener(
      PointerEvent3D.PICK_OVER, 
      () => {
        const brighter = renderer.material.baseColor.clone();
        const brightenFactor = 0.3;
        brighter.r = Math.min(brighter.r + brightenFactor, 1);
        brighter.g = Math.min(brighter.g + brightenFactor, 1);
        brighter.b = Math.min(brighter.b + brightenFactor, 1);
        //TODO: see if this is necessary for hover
        //renderer.material.baseColorMap = null;
        renderer.material.baseColor = brighter;
        console.log("Hovered");
      },
      cylinder
    );

    // Hover out (restore original)
    cylinder.addEventListener(
      PointerEvent3D.PICK_OUT, 
      () => {
        //renderer.material.baseColorMap = null;
        renderer.material.baseColor = originalColor.clone();
        console.log("Not Hovered");
      },
      cylinder
    );

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

    const toruscollider = torus.addComponent(ColliderComponent);
    toruscollider.shape = new BoxColliderShape().setFromCenterAndSize(
    new Vector3(0, 0, 0),             
    new Vector3(100, 50, 2)          
    );


    return torus;
  }
}

class ScaleTransformControl extends TransformControlBase {
  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  constructor() {
    super();
    const scaleAxes = this.transformObject3D;
    const boxX = this.createBox(new Color(1, 0, 0));
    boxX.rotationZ = -90;
    boxX.x = SQUARE_LENGTH /2;
    scaleAxes.addChild(boxX);

    const boxY = this.createBox(new Color(0, 1, 0));
    boxY.y = SQUARE_LENGTH /2 ; 
    scaleAxes.addChild(boxY);

    const boxZ = this.createBox(new Color(0, 0, 1));
    boxZ.z = SQUARE_LENGTH /2 ; 
    boxZ.rotationX = 90;
    scaleAxes.addChild(boxZ);
  }

  // TODO move this to TransformControlBase
  handlePickDown(event: PointerEvent3D) {
      this.isDragging = true;
      this.lastX = event.mouseX;
      this.lastY = event.mouseY;
      
      console.log("Drag started");
  }

  // TODO add a handler for mouse moving; if isDragging, then update lastX
  // lastY; probably use the PICK_MOVE event. note that if isDragging is false,
  // we don't want to do anything on PICK_MOVE (just return).
  
  createBox(color: Color) {
    const box = new Object3D();
    const boxgeometry = new BoxGeometry(20, 150,20);
    const boxmaterial = new LitMaterial();
    boxmaterial.baseColor = color;
    const boxrenderer = box.addComponent(MeshRenderer);
    boxrenderer.geometry = boxgeometry;
    boxrenderer.material = boxmaterial;
    let boxcollider = box.addComponent(ColliderComponent);
    boxcollider.shape = new BoxColliderShape().setFromCenterAndSize(new Vector3(0, 0, 0),new Vector3(10, 75, 10));
    box.addEventListener(
      PointerEvent3D.PICK_CLICK, 
      () => {
        const newColor = new Color(Math.random(), Math.random(), Math.random());
        console.log("Box clicked! New color:", newColor);
        boxrenderer.material.baseColor = newColor;
      }, box
    );
     box.addEventListener(
      PointerEvent3D.PICK_DOWN, (event: PointerEvent3D) => {
        this.handlePickDown(event);
      }, box

    );
    box.addEventListener(
      PointerEvent3D.PICK_UP, () => {
       if (this.isDragging) {
        this.isDragging = false;
        console.log("Drag ended (over object)");
      }
    }, box
    );
    box.addEventListener(
    PointerEvent3D.PICK_OUT, () => {
      if (this.isDragging) {
        this.isDragging = false;
        console.log("Drag ended (left object)");
      }
    }, box
);

    return box;
  }

}

(async () => {
  const app = new Sample();
  await app.run();
})();
