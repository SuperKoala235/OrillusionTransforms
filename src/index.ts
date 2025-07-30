import {
  Engine3D, Scene3D, View3D, CameraUtil,
  HoverCameraController, DirectLight, KelvinUtil,
  Object3D, CylinderGeometry, MeshRenderer, LitMaterial,
  Color, ColliderComponent, PointerEvent3D, AtmosphericComponent, BoxColliderShape, Vector3, BoxGeometry, TorusGeometry
} from '@orillusion/core';
const CYLINDER_LENGTH = 150; // Length of the cylinders
const SQUARE_LENGTH = CYLINDER_LENGTH; // Length of the square transforms
const CONE_LENGTH = CYLINDER_LENGTH / 4; // Length of the cones
const TORUS_LENGTH = CYLINDER_LENGTH/4; // Length of the torus

class Sample {
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

    this.createTranslationControl(scene);
    this.createRotationControl(scene);
    this.createScaleControl(scene);
    
    // Start render
    Engine3D.startRenderView(view);
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

    return box;
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
  createTranslationControl(scene: Scene3D) {
    const coordinateAxes = new Object3D();
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

    scene.addChild(coordinateAxes);

    return coordinateAxes;
  }

  createRotationControl(scene: Scene3D) {
    const rotationAxes = new Object3D();
    const torusZ = this.createTorus(new Color(0, 0, 1));
    torusZ.rotationZ = -90;
    torusZ.x = TORUS_LENGTH/4 - 400; //avoid overlap with the cylinder
    rotationAxes.addChild(torusZ);

    const torusX = this.createTorus(new Color(1, 0, 0));
    torusX.y = TORUS_LENGTH/4; 
    torusX.x = -400; //avoid overlap with the cylinder
    rotationAxes.addChild(torusX);

    const torusY = this.createTorus(new Color(0, 1, 0));
    torusY.z = TORUS_LENGTH/4;
    torusY.x = -400; //avoid overlap with the cylinder
    torusY.rotationX = 90;
    rotationAxes.addChild(torusY);

    scene.addChild(rotationAxes);

    return rotationAxes;
  }

  createScaleControl(scene: Scene3D) {
    const scaleAxes = new Object3D();
    const boxX = this.createBox(new Color(1, 0, 0));
    boxX.rotationZ = -90;
    boxX.x = SQUARE_LENGTH /2 + 200  // replace this with SQUARE_LENGTH / 2 when project is complete
    scaleAxes.addChild(boxX);

    const boxY = this.createBox(new Color(0, 1, 0));
    boxY.y = SQUARE_LENGTH /2 ; 
    boxY.x = 200 // delete this when project is complete
    scaleAxes.addChild(boxY);

    const boxZ = this.createBox(new Color(0, 0, 1));
    boxZ.z = SQUARE_LENGTH /2 ; 
    boxZ.x = 200; // delete this when project is complete
    boxZ.rotationX = 90;
    scaleAxes.addChild(boxZ);

    scene.addChild(scaleAxes);
    return scaleAxes;
  }
  
}

(async () => {
  const app = new Sample();
  await app.run();
})();
