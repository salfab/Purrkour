import * as THREE from 'three';

/** Small garden courtyards share their meshes and never affect the track. */
export class GardenFeatures {
  private readonly cylinder=new THREE.CylinderGeometry(1,1,1,16);
  private readonly sphere=new THREE.SphereGeometry(1,10,8);
  private readonly box=new THREE.BoxGeometry(1,1,1);
  private readonly stone=new THREE.MeshLambertMaterial({color:'#e8ca9c'});
  private readonly rim=new THREE.MeshLambertMaterial({color:'#f7e0b1'});
  private readonly water=new THREE.MeshLambertMaterial({color:'#70c7bd'});
  private readonly wood=new THREE.MeshLambertMaterial({color:'#a66c45'});
  private readonly leaf=new THREE.MeshLambertMaterial({color:'#67995d'});
  private readonly flowers=new THREE.MeshLambertMaterial({color:'#e884a1'});
  private readonly pot=new THREE.MeshLambertMaterial({color:'#c98056'});

  private mesh(parent:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material,
    x:number,y:number,z:number,sx:number,sy:number,sz:number):THREE.Mesh{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.userData.sharedHouseSpriteGeometry=true;
    parent.add(mesh);return mesh;
  }
  private planter(parent:THREE.Group,x:number,z:number):void{
    this.mesh(parent,this.cylinder,this.pot,x,.28,z,.34,.56,.34);
    this.mesh(parent,this.sphere,this.leaf,x,.78,z,.49,.42,.49);
    this.mesh(parent,this.sphere,this.flowers,x,1.05,z,.26,.22,.26);
  }
  add(parent:THREE.Group,z:number,ground:number,side:-1|1,variant:number):THREE.Group{
    const group=new THREE.Group();group.position.set(side*6.15,ground-1.8,z);
    if(variant%2===0){
      group.name='garden-fountain';
      this.mesh(group,this.cylinder,this.stone,0,.13,0,2.05,.26,2.05);
      this.mesh(group,this.cylinder,this.rim,0,.38,0,1.83,.35,1.83);
      this.mesh(group,this.cylinder,this.water,0,.57,0,1.62,.04,1.62);
      this.mesh(group,this.cylinder,this.stone,0,.94,0,.28,.75,.28);
      this.mesh(group,this.cylinder,this.rim,0,1.35,0,.91,.18,.91);
      this.mesh(group,this.cylinder,this.water,0,1.46,0,.74,.04,.74);
      this.mesh(group,this.sphere,this.water,0,1.78,0,.16,.35,.16);
      for(const [x,zz] of [[-1.8,-2.2],[1.8,2.2]] as const)this.planter(group,x,zz);
    }else{
      group.name='garden-pergola';
      for(const x of [-1.5,1.5])for(const zz of [-1.5,1.5]){
        this.mesh(group,this.box,this.wood,x,1.55,zz,.2,3.1,.2);
        this.mesh(group,this.sphere,this.leaf,x,2.9,zz,.43,.38,.43);
      }
      for(let zz=-1.6;zz<=1.61;zz+=.53)
        this.mesh(group,this.box,this.wood,0,3.1,zz,3.4,.16,.16);
      for(const x of [-1.5,1.5])this.mesh(group,this.box,this.wood,x,3.05,0,.16,.16,3.4);
      for(const x of [-1.2,0,1.2]){
        this.mesh(group,this.sphere,this.leaf,x,3.25,0,.76,.32,1.35);
        this.mesh(group,this.sphere,this.flowers,x,3.43,.55,.24,.2,.3);
      }
      this.planter(group,-1.8,-1.9);this.planter(group,1.8,1.9);
    }
    parent.add(group);return group;
  }
  dispose():void{
    for(const geometry of [this.cylinder,this.sphere,this.box])geometry.dispose();
    for(const material of [this.stone,this.rim,this.water,this.wood,this.leaf,this.flowers,this.pot])material.dispose();
  }
}
